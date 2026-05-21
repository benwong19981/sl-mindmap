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

  function handleMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation() // always block canvas pan/drag while this node is mounted
    if (isEditing) return // let browser handle native text selection
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
