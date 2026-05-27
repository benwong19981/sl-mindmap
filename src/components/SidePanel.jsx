import {
  IconPlus, IconArrowRight, IconChevronRight,
  IconChevronDown, IconTrash
} from '@tabler/icons-react'
import { useIsMobile } from '../hooks/useIsMobile.js'

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
  selectedCount,
  nodes,
  collapsed,
  onColorChange,
  onAddChild,
  onAddSibling,
  onToggleCollapse,
  onDelete,
}) {
  const isMobile = useIsMobile()

  // On desktop: don't render if nothing selected
  if (!isMobile && (!selectedId || !nodes[selectedId])) return null

  const node = selectedId ? nodes[selectedId] : null
  const isOpen = !!node
  const isRoot = node ? !node.parent : false
  const isCollapsed = selectedId ? collapsed.has(selectedId) : false
  const isMulti = selectedCount > 1
  const hasChildren = node ? Object.values(nodes).some(n => n.parent === selectedId) : false

  const panelClass = isMobile
    ? `side-panel side-panel--mobile${isOpen ? ' open' : ''}`
    : 'side-panel'

  return (
    <div className={panelClass}>
      {isMobile && <div className="panel-drag-handle" />}

      {node && (
        <>
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
            {!isMulti && (
              <button className="side-action-btn" onClick={() => onAddChild(selectedId)}>
                <IconPlus size={15} />
                Add child
              </button>
            )}
            {!isMulti && !isRoot && (
              <button className="side-action-btn" onClick={() => onAddSibling(selectedId)}>
                <IconArrowRight size={15} />
                Add sibling
              </button>
            )}
            {!isMulti && hasChildren && (
              <button className="side-action-btn" onClick={() => onToggleCollapse(selectedId)}>
                {isCollapsed ? <IconChevronRight size={15} /> : <IconChevronDown size={15} />}
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
            )}
            {!isRoot && (
              <button className="side-action-btn danger" onClick={() => onDelete(selectedId)}>
                <IconTrash size={15} />
                {isMulti ? `Delete ${selectedCount} nodes` : 'Delete'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
