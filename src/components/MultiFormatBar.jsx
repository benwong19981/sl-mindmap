import {
  IconBold, IconItalic, IconUnderline, IconStrikethrough,
  IconAlignLeft, IconAlignCenter, IconAlignRight,
  IconEraser
} from '@tabler/icons-react'

const TEXT_COLORS = [
  { label: 'Clear',   value: null  },
  { label: 'Red',     value: '#e03131' },
  { label: 'Orange',  value: '#e8590c' },
  { label: 'Yellow',  value: '#f08c00' },
  { label: 'Green',   value: '#2f9e44' },
  { label: 'Blue',    value: '#1971c2' },
  { label: 'Purple',  value: '#7048e8' },
  { label: 'Gray',    value: '#868e96' },
  { label: 'Black',   value: '#1a1a18' },
]

export default function MultiFormatBar({ selectedCount, onFormat }) {
  if (selectedCount === 0) return null

  return (
    <div className="multi-format-bar">
      <span className="multi-format-label">
        {selectedCount} node{selectedCount > 1 ? 's' : ''} selected
      </span>

      <span className="fmt-sep" />

      <button className="fmt-btn" title="Bold" onClick={() => onFormat('bold')}>
        <IconBold size={15} />
      </button>
      <button className="fmt-btn" title="Italic" onClick={() => onFormat('italic')}>
        <IconItalic size={15} />
      </button>
      <button className="fmt-btn" title="Underline" onClick={() => onFormat('underline')}>
        <IconUnderline size={15} />
      </button>
      <button className="fmt-btn" title="Strikethrough" onClick={() => onFormat('strikeThrough')}>
        <IconStrikethrough size={15} />
      </button>
      <button className="fmt-btn" title="Clear formatting" onClick={() => onFormat('removeFormat')}>
        <IconEraser size={15} />
      </button>

      <span className="fmt-sep" />

      <select
        className="fmt-select"
        title="Font size"
        defaultValue=""
        onChange={e => { if (e.target.value) onFormat('fontSize', e.target.value) }}
      >
        <option value="" disabled>Size</option>
        <option value="1">XS</option>
        <option value="2">S</option>
        <option value="3">M</option>
        <option value="4">L</option>
        <option value="5">XL</option>
        <option value="6">XXL</option>
      </select>

      <span className="fmt-sep" />

      <button className="fmt-btn" title="Align left" onClick={() => onFormat('justifyLeft')}>
        <IconAlignLeft size={15} />
      </button>
      <button className="fmt-btn" title="Align center" onClick={() => onFormat('justifyCenter')}>
        <IconAlignCenter size={15} />
      </button>
      <button className="fmt-btn" title="Align right" onClick={() => onFormat('justifyRight')}>
        <IconAlignRight size={15} />
      </button>

      <span className="fmt-sep" />

      {TEXT_COLORS.map(c => (
        <button
          key={c.label}
          className={`fmt-color-dot${c.value === null ? ' clear' : ''}`}
          title={c.label}
          style={c.value ? { background: c.value } : {}}
          onClick={() => c.value === null ? onFormat('removeFormat') : onFormat('foreColor', c.value)}
        />
      ))}
    </div>
  )
}
