import { useCallback } from 'react'

const LS_KEY = 'sl-mindmaps'

const FILE_TYPES = [{
  description: 'MindMap file',
  accept: { 'application/json': ['.mindmap', '.json'] }
}]

export function useStorage(nodes, edges, collapsed, mapTitle, loadMap) {
  function getAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') }
    catch { return {} }
  }

  function buildData(title) {
    return {
      _format: 'mindmap-v1',
      title,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
      collapsed: [...collapsed],
      nodeCount: Object.keys(nodes).length,
    }
  }

  // ─── localStorage (Ctrl+S quick-save) ───

  const saveToLS = useCallback(() => {
    const all = getAll()
    all[mapTitle] = buildData(mapTitle)
    localStorage.setItem(LS_KEY, JSON.stringify(all))
    return mapTitle
  }, [nodes, edges, collapsed, mapTitle])

  // ─── Native file save (showSaveFilePicker with fallback) ───

  const saveFileNative = useCallback(async (suggestedTitle) => {
    const data = buildData(suggestedTitle)
    const json = JSON.stringify(data, null, 2)

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${suggestedTitle}.mindmap`,
          types: FILE_TYPES,
        })
        const writable = await handle.createWritable()
        await writable.write(json)
        await writable.close()
        return suggestedTitle
      } catch (err) {
        if (err.name === 'AbortError') return null  // user cancelled
        throw err
      }
    } else {
      // Fallback: trigger download
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${suggestedTitle}.mindmap`
      a.click()
      URL.revokeObjectURL(url)
      return suggestedTitle
    }
  }, [nodes, edges, collapsed])

  // ─── Native file open (showOpenFilePicker with fallback) ───

  const openFileNative = useCallback(() => {
    if ('showOpenFilePicker' in window) {
      return window.showOpenFilePicker({ types: FILE_TYPES, multiple: false })
        .then(async ([handle]) => {
          const file = await handle.getFile()
          return parseFile(file)
        })
        .catch(err => {
          if (err.name === 'AbortError') return null  // user cancelled
          throw err
        })
    } else {
      // Fallback: hidden <input type="file">
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.mindmap,.json'
        input.onchange = async (e) => {
          const file = e.target.files?.[0]
          if (!file) { resolve(null); return }
          try { resolve(await parseFile(file)) }
          catch (err) { reject(err) }
        }
        input.click()
      })
    }
  }, [loadMap])

  async function parseFile(file) {
    const text = await file.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error('Invalid .mindmap file') }
    if (!data._format || !data.nodes || !data.edges) throw new Error('Invalid .mindmap file')
    loadMap(data.nodes, data.edges, data.collapsed || [])
    return data.title || file.name.replace(/\.(mindmap|json)$/, '') || 'Imported Map'
  }

  return { saveToLS, saveFileNative, openFileNative }
}
