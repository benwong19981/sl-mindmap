import { useState, useEffect, useRef } from 'react'
import { useMapState } from './hooks/useMapState.js'
import { useLayout } from './hooks/useLayout.js'
import { useStorage } from './hooks/useStorage.js'
import { exportToJPG } from './utils/jpgExport.js'
import { uid } from './utils/uid.js'

import Toolbar from './components/Toolbar.jsx'
import Canvas from './components/Canvas.jsx'
import FormatToolbar from './components/FormatToolbar.jsx'
import SidePanel from './components/SidePanel.jsx'
import ExportBanner from './components/ExportBanner.jsx'
import ContextMenu from './components/ContextMenu.jsx'
import Modal from './components/Modal.jsx'
import ZoomControls from './components/ZoomControls.jsx'

function Toast({ message }) {
  if (!message) return null
  return <div className="toast">{message}</div>
}

export default function App() {
  const {
    nodes, edges, collapsed,
    addChild, addSibling, deleteNode,
    updateNode, moveNode, applyLayout,
    toggleCollapse, loadMap, getRootId, getChildren
  } = useMapState()

  const [mapTitle, setMapTitle] = useState('My Mind Map')
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [exportMode, setExportMode] = useState(false)
  const [exportSelected, setExportSelected] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const [modal, setModal] = useState(null) // 'save' | 'open'
  const [toast, setToast] = useState(null)
  const [renderTick, setRenderTick] = useState(0)

  const importInputRef = useRef(null)
  const toastTimerRef = useRef(null)
  // Refs so keyboard handler always sees latest state without re-registering
  const kbRef = useRef({})

  const runLayout = useLayout(nodes, collapsed, applyLayout)

  const { saveToLS, loadFromLS, deleteFromLS, listSaved, saveFile, importFile } = useStorage(
    nodes, edges, collapsed, mapTitle, loadMap
  )

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2400)
  }

  // Two-pass layout on mount
  useEffect(() => {
    const t1 = setTimeout(() => setRenderTick(t => t + 1), 60)
    const t2 = setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 140)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function triggerLayout() {
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 60)
  }

  // ─── Node operations ───

  function handleAddChild(parentId) {
    if (!parentId) { showToast('Select a node first'); return }
    addChild(parentId)
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 60)
  }

  function handleAddSibling(nodeId) {
    const node = nodes[nodeId]
    if (!nodeId || !node) { showToast('Select a node first'); return }
    if (!node.parent) return
    addSibling(nodeId)
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 60)
  }

  function handleDelete(id) {
    const node = nodes[id]
    if (!node) return
    if (!node.parent) { showToast('Cannot delete the root node'); return }
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) setEditingId(null)
    deleteNode(id)
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 60)
  }

  function flushEdit(id) {
    if (!id) return
    const el = document.querySelector(`.node[data-id="${id}"] .node-content`)
    if (el) {
      updateNode(id, { html: el.innerHTML, label: el.innerText })
    }
    setEditingId(null)
  }

  function handleSelect(id) {
    if (editingId && editingId !== id) flushEdit(editingId)
    setSelectedId(id)
  }

  function handleDeselect() {
    if (editingId) flushEdit(editingId)
    setSelectedId(null)
  }

  function handleEdit(id) {
    setSelectedId(id)
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
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 60)
  }

  function handleAutoLayout() {
    triggerLayout()
    showToast('Layout applied')
  }

  // ─── Pan / Zoom ───

  function handlePan(x, y) {
    setPanX(x)
    setPanY(y)
  }

  function handleZoom(z, px, py) {
    setZoom(z)
    if (px !== undefined) { setPanX(px); setPanY(py) }
  }

  function handleZoomIn() {
    const nz = Math.min(3.0, zoom * 1.15)
    setZoom(nz)
  }

  function handleZoomOut() {
    const nz = Math.max(0.25, zoom / 1.15)
    setZoom(nz)
  }

  function handleFit() {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  // ─── Export mode ───

  function handleEnterExportMode() {
    setExportMode(true)
    setExportSelected(new Set())
    setSelectedId(null)
  }

  function handleExportToggle(id) {
    setExportSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleExportDragSelect(ids) {
    setExportSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
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
    setSelectedId(null)
    setEditingId(null)
    setModal(null)
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 140)
  }

  function handleDeleteFromLS(name) {
    deleteFromLS(name)
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const title = await importFile(file)
      setMapTitle(title)
      setSelectedId(null)
      setEditingId(null)
      setTimeout(() => {
        setRenderTick(t => t + 1)
        runLayout()
      }, 140)
      showToast(`✓ Imported: ${title}`)
    } catch (err) {
      showToast('Error: Invalid .mindmap file')
    }
    e.target.value = ''
  }

  function handleNew() {
    if (!window.confirm('Start a new map? Unsaved changes will be lost.')) return
    const rootId = uid()
    loadMap(
      { [rootId]: { id: rootId, label: 'Central Topic', html: 'Central Topic', x: 650, y: 370, color: 'root', parent: null } },
      [],
      []
    )
    setMapTitle('My Mind Map')
    setSelectedId(null)
    setEditingId(null)
    setTimeout(() => {
      setRenderTick(t => t + 1)
      runLayout()
    }, 140)
  }

  // ─── Keyboard shortcuts ───

  // Keep ref up-to-date every render
  kbRef.current = {
    selectedId, editingId, nodes, exportMode,
    handleAddChild, handleAddSibling, handleDelete,
    handleEdit, handleAutoLayout, handleCancelExport, handleCtrlS, handleCommitEdit, showToast
  }

  useEffect(() => {
    function handleKeyDown(e) {
      const {
        selectedId, editingId, nodes, exportMode,
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
        if (selectedId) handleAddChild(selectedId)
        else showToast('Select a node first')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedId && nodes[selectedId]?.parent) handleAddSibling(selectedId)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) handleDelete(selectedId)
      } else if (e.key === 'F2') {
        if (selectedId) handleEdit(selectedId)
      } else if (e.key === 'l' || e.key === 'L') {
        handleAutoLayout()
      } else if (e.key === 'Escape') {
        if (exportMode) handleCancelExport()
        else setSelectedId(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleCtrlS()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // stable – reads latest values from kbRef

  return (
    <>
      <Toolbar
        mapTitle={mapTitle}
        onTitleChange={setMapTitle}
        selectedId={selectedId}
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
        selectedId={selectedId}
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
      />

      <FormatToolbar editingNodeId={editingId} nodes={nodes} />

      {selectedId && !exportMode && (
        <SidePanel
          selectedId={selectedId}
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

      {/* Hidden file input for import */}
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
