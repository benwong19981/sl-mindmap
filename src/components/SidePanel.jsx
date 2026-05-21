import {
  IconPlus, IconArrowRight, IconChevronRight,
  IconChevronDown, IconTrash
} from '@tabler/icons-react'

const COLORS = [
  { key: 'blue',   bg: '#E6F1FB', border: '#378ADD' },
  { key: 'teal',   bg: '#E1F5EE', border: '#1D9E75' },
  { key: 'coral',  bg: '#FAECE7', border: '#D85A30' },
  { key: 'pink',   bg: '#FBEAF0', border: '#D4537E' },
  { key: 'amber',  bg: '#FAEEDA', border: '#BA7517' },
  { key: 'green',  bg: '#EAF3DE', border: '#639922' },
  { key: 'purple', bg: '#EEEDFE', border: '#7F77DD' },
  { key: 'gray',   bg: '#F1EFE8', border: '#888780' },
]

export default function SidePanel({
  selectedId,
  nodes,
  collapsed,
  onColorChange,
  onAddChild,
  onAddSibling,
  onToggleCollapse,
  onDelete,
}) {
  if (!selectedId || !nodes[selectedId]) return null

  const node = nodes[selectedId]
  const isRoot = !node.parent
  const isCollapsed = collapsed.has(selectedId)

  // Check if node has children
  const hasChildren = Object.values(nodes).some(n => n.parent === selectedId)

  return (
    <div className="side-panel">
      <div className="side-panel-section">
        <div className="side-panel-label">Node colour</div>
        <div className="color-grid">
          {COLORS.map(c => (
            <button
              key={c.key}
              className={`color-dot${node.color === c.key ? ' active' : ''}${isRoot ? ' disabled' : ''}`}
              style={{ background: c.bg, borderColor: node.color === c.key ? c.border : 'transparent' }}
              title={c.key}
              onClick={() => !isRoot && onColorChange(selectedId, c.key)}
              disabled={isRoot}
            />
          ))}
        </div>
      </div>

      <div className="side-panel-section">
        <div className="side-panel-label">Node actions</div>
        <button className="side-action-btn" onClick={() => onAddChild(selectedId)}>
          <IconPlus size={15} />
          Add child
        </button>
        {!isRoot && (
          <button className="side-action-btn" onClick={() => onAddSibling(selectedId)}>
            <IconArrowRight size={15} />
            Add sibling
          </button>
        )}
        {hasChildren && (
          <button className="side-action-btn" onClick={() => onToggleCollapse(selectedId)}>
            {isCollapsed ? <IconChevronRight size={15} /> : <IconChevronDown size={15} />}
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        )}
        {!isRoot && (
          <button className="side-action-btn danger" onClick={() => onDelete(selectedId)}>
            <IconTrash size={15} />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
