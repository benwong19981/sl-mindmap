import { useEffect } from 'react'
import {
  IconPlus, IconArrowRight, IconLayout,
  IconChevronRight, IconChevronDown, IconTrash
} from '@tabler/icons-react'

export default function ActionSheet({
  nodeId, nodes, collapsed,
  onAddChild, onAddSibling, onAutoLayout,
  onToggleCollapse, onDelete, onClose
}) {
  if (!nodeId || !nodes[nodeId]) return null

  const node = nodes[nodeId]
  const isRoot = !node.parent
  const isCollapsed = collapsed.has(nodeId)
  const hasChildren = Object.values(nodes).some(n => n.parent === nodeId)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function item(onClick, icon, label, danger = false) {
    return (
      <div
        className={`action-sheet-item${danger ? ' danger' : ''}`}
        onClick={() => { onClick(); onClose() }}
      >
        {icon}
        {label}
      </div>
    )
  }

  return (
    <>
      <div className="action-sheet-backdrop" onClick={onClose} />
      <div className="action-sheet">
        <div className="action-sheet-handle" />
        {item(() => onAddChild(nodeId), <IconPlus size={18} />, 'Add child')}
        {!isRoot && item(() => onAddSibling(nodeId), <IconArrowRight size={18} />, 'Add sibling')}
        {item(() => onAutoLayout(), <IconLayout size={18} />, 'Auto-layout')}
        {hasChildren && item(
          () => onToggleCollapse(nodeId),
          isCollapsed ? <IconChevronRight size={18} /> : <IconChevronDown size={18} />,
          isCollapsed ? 'Expand' : 'Collapse'
        )}
        {!isRoot && item(() => onDelete(nodeId), <IconTrash size={18} />, 'Delete', true)}
        <div className="action-sheet-item action-sheet-cancel" onClick={onClose}>
          Cancel
        </div>
      </div>
    </>
  )
}
