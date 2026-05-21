import { useRef, useState, useCallback, useEffect } from 'react'
import Node from './Node.jsx'
import EdgeLayer from './EdgeLayer.jsx'
import SelectionBox from './SelectionBox.jsx'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3.0

export default function Canvas({
  nodes,
  edges,
  collapsed,
  selectedId,
  editingId,
  exportMode,
  exportSelected,
  renderTick,
  panX, panY, zoom,
  onPan,
  onZoom,
  onSelect,
  onDeselect,
  onEdit,
  onCommitEdit,
  onDragNode,
  onContextMenu,
  onExportToggle,
  onExportDragSelect,
}) {
  const cwRef = useRef(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef(null)
  const dragNodeState = useRef(null)
  const selBoxStart = useRef(null)
  const [selBox, setSelBox] = useState(null)

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    if (exportMode) return
    e.preventDefault()
    const cw = cwRef.current
    if (!cw) return

    const rect = cw.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta))

    // Zoom around mouse cursor
    const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom)
    const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom)

    onZoom(newZoom, newPanX, newPanY)
  }, [zoom, panX, panY, exportMode, onZoom])

  useEffect(() => {
    const el = cwRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function handleMouseDown(e) {
    if (e.button !== 0) return
    // Nodes call e.stopPropagation() so if we reach here, it's always a canvas background click

    if (exportMode) {
      // Start drag-select
      const rect = cwRef.current.getBoundingClientRect()
      selBoxStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setSelBox({ x1: selBoxStart.current.x, y1: selBoxStart.current.y, x2: selBoxStart.current.x, y2: selBoxStart.current.y })
      return
    }

    // Start panning
    onDeselect()
    setIsPanning(true)
    panStart.current = { x: e.clientX - panX, y: e.clientY - panY }
    cwRef.current.classList.add('grabbing')
  }

  function handleMouseMove(e) {
    if (dragNodeState.current) {
      const { id, startX, startY, startNodeX, startNodeY } = dragNodeState.current
      const dx = (e.clientX - startX) / zoom
      const dy = (e.clientY - startY) / zoom
      onDragNode(id, startNodeX + dx, startNodeY + dy)
      return
    }

    if (isPanning && panStart.current) {
      onPan(e.clientX - panStart.current.x, e.clientY - panStart.current.y)
      return
    }

    if (selBox && selBoxStart.current) {
      const rect = cwRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setSelBox({ x1: selBoxStart.current.x, y1: selBoxStart.current.y, x2: x, y2: y })
    }
  }

  function handleMouseUp(e) {
    if (dragNodeState.current) {
      dragNodeState.current = null
      return
    }

    if (isPanning) {
      setIsPanning(false)
      panStart.current = null
      cwRef.current?.classList.remove('grabbing')
      return
    }

    if (selBox && selBoxStart.current) {
      // Compute selected nodes from box
      const cwRect = cwRef.current.getBoundingClientRect()
      const boxLeft   = Math.min(selBox.x1, selBox.x2) + cwRect.left
      const boxTop    = Math.min(selBox.y1, selBox.y2) + cwRect.top
      const boxRight  = Math.max(selBox.x1, selBox.x2) + cwRect.left
      const boxBottom = Math.max(selBox.y1, selBox.y2) + cwRect.top

      const selected = []
      for (const id of Object.keys(nodes)) {
        const el = document.querySelector(`.node[data-id="${id}"] .node-bubble`)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.right > boxLeft && r.left < boxRight && r.bottom > boxTop && r.top < boxBottom) {
          selected.push(id)
        }
      }

      onExportDragSelect(selected)
      setSelBox(null)
      selBoxStart.current = null
    }
  }

  function startNodeDrag(e, nodeId) {
    const node = nodes[nodeId]
    if (!node) return
    dragNodeState.current = {
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    }
  }

  // Visible nodes (filter out children of collapsed parents)
  function isVisible(id) {
    const node = nodes[id]
    if (!node) return false
    if (!node.parent) return true
    if (collapsed.has(node.parent)) return false
    return isVisible(node.parent)
  }

  const visibleNodes = Object.values(nodes).filter(n => isVisible(n.id))

  return (
    <div
      id="cw"
      ref={cwRef}
      className={exportMode ? 'export-mode' : ''}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        id="cv"
        style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
      >
        <EdgeLayer
          nodes={nodes}
          edges={edges}
          collapsed={collapsed}
          renderTick={renderTick}
        />

        {visibleNodes.map(node => {
          const hasChildren = Object.values(nodes).some(n => n.parent === node.id)
          return (
            <Node
              key={node.id}
              node={node}
              isSelected={selectedId === node.id}
              isEditing={editingId === node.id}
              isExportSelected={exportSelected.has(node.id)}
              isExportMode={exportMode}
              isCollapsed={collapsed.has(node.id)}
              hasChildren={hasChildren}
              onSelect={onSelect}
              onEdit={onEdit}
              onCommitEdit={onCommitEdit}
              onDragStart={startNodeDrag}
              onContextMenu={onContextMenu}
              onExportToggle={onExportToggle}
            />
          )
        })}
      </div>

      {exportMode && selBox && (
        <SelectionBox rect={selBox} />
      )}
    </div>
  )
}
