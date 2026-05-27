import { useEffect, useRef, useState } from 'react'
import {
  IconBold, IconItalic, IconUnderline, IconStrikethrough,
  IconAlignLeft, IconAlignCenter, IconAlignRight,
  IconList, IconListNumbers, IconEraser
} from '@tabler/icons-react'
import { useIsMobile } from '../hooks/useIsMobile.js'

const TEXT_COLORS = [
  { label: 'Default', value: null, bg: 'transparent', border: true },
  { label: 'Red', value: '#e03131', bg: '#e03131' },
  { label: 'Orange', value: '#e8590c', bg: '#e8590c' },
  { label: 'Yellow', value: '#f08c00', bg: '#f08c00' },
  { label: 'Green', value: '#2f9e44', bg: '#2f9e44' },
  { label: 'Blue', value: '#1971c2', bg: '#1971c2' },
  { label: 'Purple', value: '#7048e8', bg: '#7048e8' },
  { label: 'Gray', value: '#868e96', bg: '#868e96' },
  { label: 'Black', value: '#1a1a18', bg: '#1a1a18' },
]

export default function FormatToolbar({ editingNodeId, nodes }) {
  const isMobile = useIsMobile()
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const toolbarRef = useRef(null)

  useEffect(() => {
    if (!editingNodeId || isMobile) return

    function updatePos() {
      const nodeEl = document.querySelector(`.node[data-id="${editingNodeId}"] .node-bubble`)
      const toolbar = toolbarRef.current
      if (!nodeEl || !toolbar) return

      const rect = nodeEl.getBoundingClientRect()
      const tbRect = toolbar.getBoundingClientRect()
      const vpad = 8

      let top = rect.top - tbRect.height - vpad
      let left = rect.left + rect.width / 2 - tbRect.width / 2

      // Clamp to viewport
      if (top < 8) top = rect.bottom + vpad
      if (left < 8) left = 8
      if (left + tbRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tbRect.width - 8
      }

      setPos({ top, left })
    }

    updatePos()
    // Reposition on resize
    window.addEventListener('resize', updatePos)
    return () => window.removeEventListener('resize', updatePos)
  }, [editingNodeId])

  function cmd(command, value) {
    document.execCommand(command, false, value)
  }

  function handleMouseDown(e, command, value) {
    e.preventDefault() // Don't steal focus
    cmd(command, value)
  }

  if (!editingNodeId) return null

  return (
    <div
      ref={toolbarRef}
      className="format-toolbar"
      style={isMobile ? {} : { top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()}
    >
      <button className="fmt-btn" title="Bold" onMouseDown={e => handleMouseDown(e, 'bold')}>
        <IconBold size={15} />
      </button>
      <button className="fmt-btn" title="Italic" onMouseDown={e => handleMouseDown(e, 'italic')}>
        <IconItalic size={15} />
      </button>
      <button className="fmt-btn" title="Underline" onMouseDown={e => handleMouseDown(e, 'underline')}>
        <IconUnderline size={15} />
      </button>
      <button className="fmt-btn" title="Strikethrough" onMouseDown={e => handleMouseDown(e, 'strikeThrough')}>
        <IconStrikethrough size={15} />
      </button>
      <button className="fmt-btn" title="Clear formatting" onMouseDown={e => handleMouseDown(e, 'removeFormat')}>
        <IconEraser size={15} />
      </button>

      <span className="fmt-sep" />

      <select
        className="fmt-select"
        title="Font size"
        defaultValue="3"
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          e.preventDefault()
          cmd('fontSize', e.target.value)
        }}
      >
        <option value="1">XS</option>
        <option value="2">S</option>
        <option value="3">M</option>
        <option value="4">L</option>
        <option value="5">XL</option>
        <option value="6">XXL</option>
      </select>

      <span className="fmt-sep" />

      <button className="fmt-btn" title="Align left" onMouseDown={e => handleMouseDown(e, 'justifyLeft')}>
        <IconAlignLeft size={15} />
      </button>
      <button className="fmt-btn" title="Align center" onMouseDown={e => handleMouseDown(e, 'justifyCenter')}>
        <IconAlignCenter size={15} />
      </button>
      <button className="fmt-btn" title="Align right" onMouseDown={e => handleMouseDown(e, 'justifyRight')}>
        <IconAlignRight size={15} />
      </button>

      <span className="fmt-sep" />

      <button className="fmt-btn" title="Bullet list" onMouseDown={e => handleMouseDown(e, 'insertUnorderedList')}>
        <IconList size={15} />
      </button>
      <button className="fmt-btn" title="Numbered list" onMouseDown={e => handleMouseDown(e, 'insertOrderedList')}>
        <IconListNumbers size={15} />
      </button>

      <span className="fmt-sep" />

      {TEXT_COLORS.map(c => (
        <button
          key={c.label}
          className={`fmt-color-dot${c.value === null ? ' clear' : ''}`}
          title={c.label}
          style={c.value !== null ? { background: c.bg } : {}}
          onMouseDown={e => {
            e.preventDefault()
            if (c.value === null) cmd('removeFormat')
            else cmd('foreColor', c.value)
          }}
        />
      ))}
    </div>
  )
}
