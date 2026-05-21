import { useCallback } from 'react'

const LS_KEY = 'sl-mindmaps'

export function useStorage(nodes, edges, collapsed, mapTitle, loadMap) {
  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    } catch {
      return {}
    }
  }

  const saveToLS = useCallback(() => {
    const all = getAll()
    all[mapTitle] = {
      _format: 'mindmap-v1',
      title: mapTitle,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
      collapsed: [...collapsed],
      nodeCount: Object.keys(nodes).length,
    }
    localStorage.setItem(LS_KEY, JSON.stringify(all))
    return mapTitle
  }, [nodes, edges, collapsed, mapTitle])

  const loadFromLS = useCallback((name) => {
    const all = getAll()
    const entry = all[name]
    if (!entry) return false
    loadMap(entry.nodes, entry.edges, entry.collapsed || [])
    return true
  }, [loadMap])

  const deleteFromLS = useCallback((name) => {
    const all = getAll()
    delete all[name]
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  }, [])

  const listSaved = useCallback(() => {
    const all = getAll()
    return Object.values(all)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
  }, [])

  const saveFile = useCallback((filename) => {
    const data = {
      _format: 'mindmap-v1',
      title: filename,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
      collapsed: [...collapsed],
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.mindmap`
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges, collapsed])

  const importFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (!data._format || !data.nodes || !data.edges) {
            reject(new Error('Invalid .mindmap file'))
            return
          }
          loadMap(data.nodes, data.edges, data.collapsed || [])
          resolve(data.title || 'Imported Map')
        } catch {
          reject(new Error('Invalid .mindmap file'))
        }
      }
      reader.onerror = () => reject(new Error('File read error'))
      reader.readAsText(file)
    })
  }, [loadMap])

  return { saveToLS, loadFromLS, deleteFromLS, listSaved, saveFile, importFile }
}
