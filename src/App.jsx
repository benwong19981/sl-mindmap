import { useState, useEffect, useRef } from 'react'
import { useMapState } from './hooks/useMapState.js'
import { useLayout } from './hooks/useLayout.js'
import { useStorage } from './hooks/useStorage.js'
import { exportToJPG } from './utils/jpgExport.js'
import { uid } from './utils/uid.js'

import Toolbar from './components/Toolbar.jsx'
import Canvas from './components/Canvas.jsx'
import FormatToolbar from './components/FormatToolbar.jsx'
import MultiFormatBar from './components/MultiFormatBar.jsx'
import SidePanel from './components/SidePanel.jsx'
import ExportBanner from './components/ExportBanner.jsx'
import ContextMenu from './components/ContextMenu.jsx'
import Modal from './components/Modal.jsx'
import ZoomControls from './components/ZoomControls.jsx'

function Toast({ message }) {
  if (!message) return null
  return <div className="toast">{message}</div>
}

// Apply an execCommand to an entire HTML string using a hidden contenteditable
function applyFormatToHtml(html, command, value) {
  const div = document.createElement('div')
  div.contentEditable = 'true'
  div.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:-9999px;top:-9999px'
  document.body.appendChild(div)
  div.innerHTML = html
  div.focus()
  const range = document.createRange()
  range.selectNodeContents(div)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  document.execCommand(command, false, value ?? null)
  const result = div.innerHTML
  document.body.removeChild(div)
  sel.removeAllRanges()
  return result
}

export default function App() {
  const {
    nodes, edges, collapsed,
    addChild, addSibling, deleteNode,
    updateNode, moveNode, applyLayout,
    toggleCollapse, loadMap, getRootId,
  } = useMapState()

  const [mapTitle, setMapTitle] = useState('My Mind Map')
  // Multi-select: Set of selected node IDs
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [exportMode, setExportMode] = useState(false)
  const [exportSelected, setExportSelected] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [renderTick, setRenderTick] = useState(0)

  const importInputRef = useRef(null)
  const toastTimerRef = useRef(null)
  const kbRef = useRef({})

  // Primary selected node = last item in the set
  const primaryId = [...selectedIds].at(-1) || null

  const runLayout = useLayout(nodes, collapsed, applyLayout)

  const { saveToLS, loadFromLS, deleteFromLS, listSaved, saveFile, importFile } = useStorage(
    nodes, edges, collapsed, mapTitle, loadMap
  )

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2400)
  }

  useEffect(() => {
    const t1 = setTimeout(() => setRenderTick(t => t + 1), 60)
    const t2 = setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 140)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function triggerLayout() {
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 60)
  }

  // ─── Node operations ───

  function handleAddChild(parentId) {
    if (!parentId) { showToast('Select a node first'); return }
    addChild(parentId)
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 60)
  }

  function handleAddSibling(nodeId) {
    const node = nodes[nodeId]
    if (!nodeId || !node) { showToast('Select a node first'); return }
    if (!node.parent) return
    addSibling(nodeId)
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 60)
  }

  function handleDelete(id) {
    // If called from multi-select context (id is the primaryId), delete all selected non-root nodes
    const toDelete = selectedIds.size > 1 && selectedIds.has(id)
      ? [...selectedIds]
      : [id]

    let blocked = false
    for (const did of toDelete) {
      const node = nodes[did]
      if (!node) continue
      if (!node.parent) { showToast('Cannot delete the root node'); blocked = true; continue }
      if (editingId === did) setEditingId(null)
      deleteNode(did)
    }
    if (!blocked) setSelectedIds(new Set())
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 60)
  }

  function flushEdit(id) {
    if (!id) return
    const el = document.querySelector(`.node[data-id="${id}"] .node-content`)
    if (el) updateNode(id, { html: el.innerHTML, label: el.innerText })
    setEditingId(null)
  }

  function handleSelect(id, addToSelection = false) {
    if (editingId && editingId !== id) flushEdit(editingId)
    if (addToSelection) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds(new Set([id]))
    }
  }

  function handleDeselect() {
    if (editingId) flushEdit(editingId)
    setSelectedIds(new Set())
  }

  function handleRubberBandSelect(ids) {
    if (ids.length === 0) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  function handleEdit(id) {
    setSelectedIds(new Set([id]))
    setEditingId(id)
  }

  function handleCommitEdit(id, html, label) {
    updateNode(id, { html, label })
    setEditingId(null)
    setRenderTick(t => t + 1)
  }

  function handleDragNode(id, x, y) {
    moveNode(id, x, y)
    setRenderTick(t => t + 1)
  }

  function handleColorChange(id, color) {
    updateNode(id, { color })
    setRenderTick(t => t + 1)
  }

  function handleToggleCollapse(id) {
    toggleCollapse(id)
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 60)
  }

  function handleAutoLayout() {
    triggerLayout()
    showToast('Layout applied')
  }

  // ─── Bulk format (apply to all selected nodes' HTML) ───

  function handleBulkFormat(command, value) {
    for (const id of selectedIds) {
      const node = nodes[id]
      if (!node) continue
      const newHtml = applyFormatToHtml(node.html || node.label || '', command, value)
      updateNode(id, { html: newHtml })
    }
    setRenderTick(t => t + 1)
  }

  // ─── Pan / Zoom ───

  function handlePan(x, y) { setPanX(x); setPanY(y) }

  function handleZoom(z, px, py) {
    setZoom(z)
    if (px !== undefined) { setPanX(px); setPanY(py) }
  }

  function handleZoomIn()  { setZoom(z => Math.min(3.0, z * 1.15)) }
  function handleZoomOut() { setZoom(z => Math.max(0.25, z / 1.15)) }
  function handleFit()     { setZoom(1); setPanX(0); setPanY(0) }

  // ─── Export mode ───

  function handleEnterExportMode() {
    setExportMode(true)
    setExportSelected(new Set())
    setSelectedIds(new Set())
  }

  function handleExportToggle(id) {
    setExportSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleExportDragSelect(ids) {
    setExportSelected(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next })
  }

  function handleExportJPG() {
    if (exportSelected.size === 0) return
    exportToJPG([...exportSelected], nodes, edges, mapTitle)
    setExportMode(false)
    setExportSelected(new Set())
    showToast('✓ JPG exported!')
  }

  function handleCancelExport() {
    setExportMode(false)
    setExportSelected(new Set())
  }

  // ─── Context menu ───

  function handleContextMenu(e, nodeId) {
    // If right-clicked node isn't in selection, make it the only selection
    if (!selectedIds.has(nodeId)) setSelectedIds(new Set([nodeId]))
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }

  // ─── Save / Open ───

  function handleCtrlS() {
    saveToLS()
    showToast(`✓ Saved: ${mapTitle}`)
  }

  function handleSaveFile(filename) {
    saveFile(filename)
    setModal(null)
    setMapTitle(filename)
  }

  function handleLoadFromLS(name) {
    loadFromLS(name)
    setMapTitle(name)
    setSelectedIds(new Set())
    setEditingId(null)
    setModal(null)
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 140)
  }

  function handleDeleteFromLS(name) { deleteFromLS(name) }

  function handleImportClick() { importInputRef.current?.click() }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const title = await importFile(file)
      setMapTitle(title)
      setSelectedIds(new Set())
      setEditingId(null)
      setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 140)
      showToast(`✓ Imported: ${title}`)
    } catch {
      showToast('Error: Invalid .mindmap file')
    }
    e.target.value = ''
  }

  function handleNew() {
    if (!window.confirm('Start a new map? Unsaved changes will be lost.')) return
    const rootId = uid()
    loadMap(
      { [rootId]: { id: rootId, label: 'Central Topic', html: 'Central Topic', x: 650, y: 370, color: 'root', parent: null } },
      [], []
    )
    setMapTitle('My Mind Map')
    setSelectedIds(new Set())
    setEditingId(null)
    setTimeout(() => { setRenderTick(t => t + 1); runLayout() }, 140)
  }

  // ─── Keyboard shortcuts (ref-based to avoid stale closures) ───

  kbRef.current = {
    primaryId, editingId, nodes, exportMode, selectedIds,
    handleAddChild, handleAddSibling, handleDelete,
    handleEdit, handleAutoLayout, handleCancelExport, handleCtrlS, handleCommitEdit, showToast
  }

  useEffect(() => {
    function handleKeyDown(e) {
      const {
        primaryId, editingId, nodes, exportMode, selectedIds,
        handleAddChild, handleAddSibling, handleDelete,
        handleEdit, handleAutoLayout, handleCancelExport, handleCtrlS, handleCommitEdit, showToast
      } = kbRef.current

      const tag = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if (editingId) {
        if (e.key === 'Escape') {
          e.preventDefault()
          const el = document.querySelector(`.node[data-id="${editingId}"] .node-content`)
          if (el) handleCommitEdit(editingId, el.innerHTML, el.innerText)
        }
        return
      }

      if (isInput) return

      if (e.key === 'Tab') {
        e.preventDefault()
        if (primaryId) handleAddChild(primaryId)
        else showToast('Select a node first')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (primaryId && nodes[primaryId]?.parent) handleAddSibling(primaryId)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (primaryId) handleDelete(primaryId)
      } else if (e.key === 'F2') {
        if (primaryId) handleEdit(primaryId)
      } else if (e.key === 'l' || e.key === 'L') {
        handleAutoLayout()
      } else if (e.key === 'Escape') {
        if (exportMode) handleCancelExport()
        else setSelectedIds(new Set())
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleCtrlS()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        // Select all visible nodes
        setSelectedIds(new Set(Object.keys(nodes)))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Toolbar
        mapTitle={mapTitle}
        onTitleChange={setMapTitle}
        selectedId={primaryId}
        nodes={nodes}
        collapsed={collapsed}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onToggleCollapse={handleToggleCollapse}
        onAutoLayout={handleAutoLayout}
        onDelete={handleDelete}
        onOpen={() => setModal('open')}
        onSaveFile={() => setModal('save')}
        onImport={handleImportClick}
        onExportMode={handleEnterExportMode}
        onNew={handleNew}
      />

      <Canvas
        nodes={nodes}
        edges={edges}
        collapsed={collapsed}
        selectedIds={selectedIds}
        editingId={editingId}
        exportMode={exportMode}
        exportSelected={exportSelected}
        renderTick={renderTick}
        panX={panX}
        panY={panY}
        zoom={zoom}
        onPan={handlePan}
        onZoom={handleZoom}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onEdit={handleEdit}
        onCommitEdit={handleCommitEdit}
        onDragNode={handleDragNode}
        onContextMenu={handleContextMenu}
        onExportToggle={handleExportToggle}
        onExportDragSelect={handleExportDragSelect}
        onRubberBandSelect={handleRubberBandSelect}
      />

      <FormatToolbar editingNodeId={editingId} nodes={nodes} />

      {selectedIds.size > 0 && !editingId && !exportMode && (
        <MultiFormatBar
          selectedCount={selectedIds.size}
          onFormat={handleBulkFormat}
        />
      )}

      {primaryId && !exportMode && (
        <SidePanel
          selectedId={primaryId}
          selectedCount={selectedIds.size}
          nodes={nodes}
          collapsed={collapsed}
          onColorChange={handleColorChange}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onToggleCollapse={handleToggleCollapse}
          onDelete={handleDelete}
        />
      )}

      {exportMode && (
        <ExportBanner
          selCount={exportSelected.size}
          onExportJPG={handleExportJPG}
          onCancel={handleCancelExport}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodes={nodes}
          collapsed={collapsed}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onAutoLayout={handleAutoLayout}
          onToggleCollapse={handleToggleCollapse}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}

      {modal && (
        <Modal
          mode={modal}
          onClose={() => setModal(null)}
          onSave={handleSaveFile}
          onLoad={handleLoadFromLS}
          onDelete={handleDeleteFromLS}
          listSaved={listSaved}
        />
      )}

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
      />

      <Toast message={toast} />

      <input
        ref={importInputRef}
        type="file"
        accept=".mindmap,.json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </>
  )
}
