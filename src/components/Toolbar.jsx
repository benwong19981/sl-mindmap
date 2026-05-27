import {
  IconBrain,
  IconPlus, IconArrowRight, IconChevronRight,
  IconLayout, IconTrash,
  IconFolderOpen, IconDeviceFloppy,
  IconPhoto, IconFile
} from '@tabler/icons-react'
import { useIsMobile } from '../hooks/useIsMobile.js'

export default function Toolbar({
  mapTitle,
  onTitleChange,
  selectedId,
  nodes,
  collapsed,
  onAddChild,
  onAddSibling,
  onToggleCollapse,
  onAutoLayout,
  onDelete,
  onOpen,
  onSave,
  onExportMode,
  onNew,
}) {
  const isMobile = useIsMobile()
  const node = selectedId ? nodes[selectedId] : null
  const isRoot = node && !node.parent
  const isCollapsed = selectedId && collapsed.has(selectedId)
  const hasChildren = node && Object.values(nodes).some(n => n.parent === selectedId)

  if (isMobile) {
    return (
      <div className="toolbar toolbar--mobile">
        <div className="toolbar-row1">
          <div className="toolbar-logo">
            <IconBrain size={20} />
            SL MindMap
          </div>
          <input
            className="toolbar-title"
            value={mapTitle}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="Untitled Map"
          />
          <button className="tb-btn" title="New map" onClick={onNew}>
            <IconFile size={18} />
          </button>
        </div>
        <div className="toolbar-row2">
          <button className="tb-btn" title="Add child (Tab)" disabled={!selectedId}
            onClick={() => selectedId && onAddChild(selectedId)}>
            <IconPlus size={18} />
          </button>
          <button className="tb-btn" title="Add sibling (Enter)" disabled={!selectedId || isRoot}
            onClick={() => selectedId && !isRoot && onAddSibling(selectedId)}>
            <IconArrowRight size={18} />
          </button>
          <button className="tb-btn" title="Collapse / Expand" disabled={!selectedId || !hasChildren}
            onClick={() => selectedId && hasChildren && onToggleCollapse(selectedId)}>
            <IconChevronRight size={18} />
          </button>
          <button className="tb-btn" title="Auto-layout (L)" onClick={onAutoLayout}>
            <IconLayout size={18} />
          </button>
          <button className="tb-btn danger" title="Delete (Del)" disabled={!selectedId || isRoot}
            onClick={() => selectedId && !isRoot && onDelete(selectedId)}>
            <IconTrash size={18} />
          </button>
          <span className="toolbar-sep" />
          <button className="tb-btn" title="Open file" onClick={onOpen}>
            <IconFolderOpen size={18} />
          </button>
          <button className="tb-btn" title="Save file" onClick={onSave}>
            <IconDeviceFloppy size={18} />
          </button>
          <button className="tb-btn primary" title="Export JPG" onClick={onExportMode}>
            <IconPhoto size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="toolbar">
      <div className="toolbar-logo">
        <IconBrain size={22} />
        SL MindMap
      </div>

      <input
        className="toolbar-title"
        value={mapTitle}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Untitled Map"
      />

      <span className="toolbar-sep" />

      <button className="tb-btn" title="Add child (Tab)" onClick={() => selectedId ? onAddChild(selectedId) : null} disabled={!selectedId}>
        <IconPlus size={16} /> Child
      </button>
      <button className="tb-btn" title="Add sibling (Enter)" onClick={() => selectedId && !isRoot ? onAddSibling(selectedId) : null} disabled={!selectedId || isRoot}>
        <IconArrowRight size={16} /> Sibling
      </button>
      <button className="tb-btn" title="Collapse / Expand" onClick={() => selectedId && hasChildren ? onToggleCollapse(selectedId) : null} disabled={!selectedId || !hasChildren}>
        <IconChevronRight size={16} /> {isCollapsed ? 'Expand' : 'Collapse'}
      </button>
      <button className="tb-btn" title="Auto-layout (L)" onClick={onAutoLayout}>
        <IconLayout size={16} /> Layout
      </button>
      <button className="tb-btn danger" title="Delete (Del)" onClick={() => selectedId && !isRoot ? onDelete(selectedId) : null} disabled={!selectedId || isRoot}>
        <IconTrash size={16} /> Delete
      </button>

      <span className="toolbar-spacer" />

      <button className="tb-btn" title="Open file" onClick={onOpen}>
        <IconFolderOpen size={16} /> Open
      </button>
      <button className="tb-btn" title="Save file (Ctrl+S quick-saves)" onClick={onSave}>
        <IconDeviceFloppy size={16} /> Save
      </button>
      <button className="tb-btn primary" title="Export JPG" onClick={onExportMode}>
        <IconPhoto size={16} /> Export JPG
      </button>
      <button className="tb-btn" title="New map" onClick={onNew}>
        <IconFile size={16} /> New
      </button>
    </div>
  )
}
