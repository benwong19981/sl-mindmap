import { useRef, useEffect } from 'react'

export default function Node({
  node,
  isSelected,
  isEditing,
  isExportSelected,
  isExportMode,
  isCollapsed,
  hasChildren,
  onSelect,
  onEdit,
  onCommitEdit,
  onDragStart,
  onContextMenu,
  onExportToggle,
}) {
  const contentRef = useRef(null)

  // Touch interaction state
  const lastTapRef = useRef(0)
  const longPressRef = useRef(null)
  const touchStartRef = useRef(null)
  const touchDraggingRef = useRef(false)

  // Sync html into DOM (always imperative to avoid React/contentEditable conflict)
  useEffect(() => {
    if (!isEditing && contentRef.current) {
      const target = node.html || node.label || ''
      if (contentRef.current.innerHTML !== target) {
        contentRef.current.innerHTML = target
      }
    }
  }, [node.html, node.label, isEditing])

  // Focus and move cursor to end when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(contentRef.current)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [isEditing])

  // Cancel long-press timer on unmount
  useEffect(() => {
    return () => clearTimeout(longPressRef.current)
  }, [])

  function handleMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation()
    if (isEditing) return
    if (isExportMode) return
    onDragStart(e, node.id)
  }

  function handleClick(e) {
    e.stopPropagation()
    if (isExportMode) {
      onExportToggle(node.id)
      return
    }
    if (!isEditing) onSelect(node.id, e.shiftKey)
  }

  function handleDoubleClick(e) {
    e.stopPropagation()
    if (isExportMode) return
    onEdit(node.id)
  }

  function handleContextMenu(e) {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, node.id)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (contentRef.current) {
        onCommitEdit(node.id, contentRef.current.innerHTML, contentRef.current.innerText)
      }
    }
  }

  // ─── Touch handlers ───

  function handleTouchStart(e) {
    e.stopPropagation()
    if (isEditing) return // let browser handle text cursor placement
    e.preventDefault()

    if (isExportMode) {
      onExportToggle(node.id)
      return
    }

    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    touchDraggingRef.current = false

    longPressRef.current = setTimeout(() => {
      longPressRef.current = null
      touchStartRef.current = null
      onContextMenu({ clientX: t.clientX, clientY: t.clientY }, node.id)
    }, 500)
  }

  function handleTouchMove(e) {
    if (!touchStartRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y

    if (!touchDraggingRef.current && Math.hypot(dx, dy) > 8) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
      touchDraggingRef.current = true
      // Pass touch start coords so canvas can compute delta from the right origin
      onDragStart(
        { touches: [{ clientX: touchStartRef.current.x, clientY: touchStartRef.current.y }] },
        node.id
      )
    }
  }

  function handleTouchEnd(e) {
    clearTimeout(longPressRef.current)
    longPressRef.current = null

    if (touchDraggingRef.current) {
      touchDraggingRef.current = false
      touchStartRef.current = null
      return
    }

    if (!touchStartRef.current) return // long-press context menu was triggered
    touchStartRef.current = null

    if (isExportMode) return // handled in touchStart

    // Double-tap → edit, single tap → select
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0
      onEdit(node.id)
    } else {
      lastTapRef.current = now
      onSelect(node.id, false)
    }
  }

  const colorClass = `nc-${node.color}`
  const isRoot = !node.parent

  let cls = `node${isRoot ? ' root' : ''}`
  if (isSelected) cls += ' sel'
  if (isEditing) cls += ' editing'
  if (isExportSelected) cls += ' xpick'

  return (
    <div
      className={cls}
      data-id={node.id}
      style={{ left: node.x, top: node.y }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`node-bubble ${colorClass}`}>
        <div
          ref={contentRef}
          className="node-content"
          contentEditable={isEditing || undefined}
          suppressContentEditableWarning
          onKeyDown={isEditing ? handleKeyDown : undefined}
        />
        {isCollapsed && hasChildren && (
          <span className="node-collapse-icon">▸</span>
        )}
      </div>
    </div>
  )
}
