import { useEffect, useRef } from 'react'
import {
  IconPlus, IconArrowRight, IconLayout,
  IconChevronRight, IconChevronDown, IconTrash
} from '@tabler/icons-react'

export default function ContextMenu({
  x, y, nodeId, nodes, collapsed,
  onAddChild, onAddSibling, onAutoLayout,
  onToggleCollapse, onDelete, onClose
}) {
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Clamp position to viewport
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const el = ref.current
    if (rect.right > window.innerWidth - 8) {
      el.style.left = `${window.innerWidth - rect.width - 8}px`
    }
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = `${window.innerHeight - rect.height - 8}px`
    }
  })

  if (!nodeId || !nodes[nodeId]) return null

  const node = nodes[nodeId]
  const isRoot = !node.parent
  const isCollapsed = collapsed.has(nodeId)
  const hasChildren = Object.values(nodes).some(n => n.parent === nodeId)

  function item(onClick, icon, label, danger = false) {
    return (
      <div
        className={`ctx-item${danger ? ' danger' : ''}`}
        onClick={() => { onClick(); onClose() }}
      >
        {icon}
        {label}
      </div>
    )
  }

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {item(() => onAddChild(nodeId), <IconPlus size={15} />, 'Add child')}
      {!isRoot && item(() => onAddSibling(nodeId), <IconArrowRight size={15} />, 'Add sibling')}
      <div className="ctx-sep" />
      {item(() => onAutoLayout(), <IconLayout size={15} />, 'Auto-layout')}
      {hasChildren && item(
        () => onToggleCollapse(nodeId),
        isCollapsed ? <IconChevronRight size={15} /> : <IconChevronDown size={15} />,
        isCollapsed ? 'Expand' : 'Collapse'
      )}
      {!isRoot && <div className="ctx-sep" />}
      {!isRoot && item(() => onDelete(nodeId), <IconTrash size={15} />, 'Delete', true)}
    </div>
  )
}
