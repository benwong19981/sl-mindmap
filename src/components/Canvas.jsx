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
  selectedIds,
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
  onRubberBandSelect,
}) {
  const cwRef = useRef(null)
  const isPanningRef = useRef(false)
  const panStart = useRef(null)
  const dragNodeState = useRef(null)
  const selBoxStart = useRef(null)
  const selBoxMode = useRef(null) // 'export' | 'normal'
  const [selBox, setSelBox] = useState(null)

  // Refs so touch handlers can read latest values without stale closures
  const ctxRef = useRef({})
  ctxRef.current = { zoom, panX, panY, exportMode, onZoom, onPan, onDeselect, onDragNode, nodes, onExportDragSelect, onRubberBandSelect }

  // Touch pinch state
  const pinchRef = useRef(null) // { startDist, startZoom, startPanX, startPanY, midX, midY }

  // ─── Wheel: pinch (ctrlKey=true) → zoom, two-finger swipe → pan ───

  const handleWheel = useCallback((e) => {
    if (exportMode) return
    e.preventDefault()
    const cw = cwRef.current
    if (!cw) return

    if (e.ctrlKey) {
      const rect = cw.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const factor = 1 - e.deltaY * 0.01
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor))
      const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom)
      const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom)
      onZoom(newZoom, newPanX, newPanY)
    } else {
      onPan(panX - e.deltaX, panY - e.deltaY)
    }
  }, [zoom, panX, panY, exportMode, onZoom, onPan])

  useEffect(() => {
    const el = cwRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ─── Touch: canvas pan + pinch-zoom ───
  // Registered via useEffect with passive:false so preventDefault works on iOS

  const handleCwTouchStart = useCallback((e) => {
    const { panX, panY, zoom, onDeselect } = ctxRef.current
    e.preventDefault()

    if (e.touches.length >= 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const midX = (t1.clientX + t2.clientX) / 2
      const midY = (t1.clientY + t2.clientY) / 2
      pinchRef.current = { startDist: dist, startZoom: zoom, startPanX: panX, startPanY: panY, midX, midY }
      isPanningRef.current = false
      panStart.current = null
      return
    }

    // Single finger on canvas background → deselect + pan
    onDeselect()
    const t = e.touches[0]
    isPanningRef.current = true
    panStart.current = { x: t.clientX - panX, y: t.clientY - panY }
    pinchRef.current = null
  }, [])

  const handleCwTouchMove = useCallback((e) => {
    const { zoom, onZoom, onPan } = ctxRef.current
    e.preventDefault()

    if (pinchRef.current && e.touches.length >= 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const { startDist, startZoom, startPanX, startPanY, midX, midY } = pinchRef.current
      const cw = cwRef.current
      if (!cw) return
      const rect = cw.getBoundingClientRect()
      const px = midX - rect.left
      const py = midY - rect.top
      const factor = dist / startDist
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * factor))
      const newPanX = px - (px - startPanX) * (newZoom / startZoom)
      const newPanY = py - (py - startPanY) * (newZoom / startZoom)
      onZoom(newZoom, newPanX, newPanY)
      return
    }

    if (isPanningRef.current && panStart.current && e.touches.length >= 1) {
      const t = e.touches[0]
      onPan(t.clientX - panStart.current.x, t.clientY - panStart.current.y)
    }
  }, [])

  const handleCwTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      isPanningRef.current = false
      panStart.current = null
      pinchRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = cwRef.current
    if (!el) return
    el.addEventListener('touchstart', handleCwTouchStart, { passive: false })
    el.addEventListener('touchmove', handleCwTouchMove, { passive: false })
    el.addEventListener('touchend', handleCwTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleCwTouchStart)
      el.removeEventListener('touchmove', handleCwTouchMove)
      el.removeEventListener('touchend', handleCwTouchEnd)
    }
  }, [handleCwTouchStart, handleCwTouchMove, handleCwTouchEnd])

  // ─── Document-level touch handlers for node drag ───
  // touchmove fires on the element where touchstart fired (the Node),
  // so we listen at the document level to continue node drags.

  useEffect(() => {
    function onDocTouchMove(e) {
      if (!dragNodeState.current) return
      e.preventDefault()
      const t = e.touches[0]
      const { id, startX, startY, startNodeX, startNodeY } = dragNodeState.current
      const { zoom, onDragNode } = ctxRef.current
      const dx = (t.clientX - startX) / zoom
      const dy = (t.clientY - startY) / zoom
      onDragNode(id, startNodeX + dx, startNodeY + dy)
    }

    function onDocTouchEnd() {
      dragNodeState.current = null
    }

    document.addEventListener('touchmove', onDocTouchMove, { passive: false })
    document.addEventListener('touchend', onDocTouchEnd)
    return () => {
      document.removeEventListener('touchmove', onDocTouchMove)
      document.removeEventListener('touchend', onDocTouchEnd)
    }
  }, []) // stable — uses ctxRef for latest values

  // ─── Keyboard offset when virtual keyboard opens (mobile editing) ───

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv || !editingId) return

    function adjust() {
      const keyboardH = window.innerHeight - vv.height - vv.offsetTop
      if (cwRef.current) {
        cwRef.current.style.paddingBottom = keyboardH > 0 ? `${keyboardH}px` : ''
      }
    }

    vv.addEventListener('resize', adjust)
    vv.addEventListener('scroll', adjust)
    adjust()

    return () => {
      vv.removeEventListener('resize', adjust)
      vv.removeEventListener('scroll', adjust)
      if (cwRef.current) cwRef.current.style.paddingBottom = ''
    }
  }, [editingId])

  // ─── Mouse handlers ───

  function handleMouseDown(e) {
    if (e.button !== 0) return

    if (exportMode) {
      const rect = cwRef.current.getBoundingClientRect()
      selBoxStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      selBoxMode.current = 'export'
      setSelBox({ x1: selBoxStart.current.x, y1: selBoxStart.current.y, x2: selBoxStart.current.x, y2: selBoxStart.current.y })
      return
    }

    if (e.shiftKey) {
      const rect = cwRef.current.getBoundingClientRect()
      selBoxStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      selBoxMode.current = 'normal'
      setSelBox({ x1: selBoxStart.current.x, y1: selBoxStart.current.y, x2: selBoxStart.current.x, y2: selBoxStart.current.y })
      return
    }

    onDeselect()
    isPanningRef.current = true
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

    if (isPanningRef.current && panStart.current) {
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

    if (isPanningRef.current) {
      isPanningRef.current = false
      panStart.current = null
      cwRef.current?.classList.remove('grabbing')
      return
    }

    if (selBox && selBoxStart.current) {
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

      if (selBoxMode.current === 'export') onExportDragSelect(selected)
      else onRubberBandSelect(selected)

      setSelBox(null)
      selBoxStart.current = null
      selBoxMode.current = null
    }
  }

  function startNodeDrag(e, nodeId) {
    const node = nodes[nodeId]
    if (!node) return
    // Support both mouse events and touch-like objects { touches: [...] }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragNodeState.current = {
      id: nodeId,
      startX: clientX,
      startY: clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    }
  }

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
              isSelected={selectedIds.has(node.id)}
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

      {selBox && (
        <div
          className={selBoxMode.current === 'export' ? 'selection-box' : 'selection-box-normal'}
          style={{
            left: Math.min(selBox.x1, selBox.x2),
            top: Math.min(selBox.y1, selBox.y2),
            width: Math.abs(selBox.x2 - selBox.x1),
            height: Math.abs(selBox.y2 - selBox.y1),
          }}
        />
      )}
    </div>
  )
}
