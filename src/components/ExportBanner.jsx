import { IconPhoto, IconX } from '@tabler/icons-react'

export default function ExportBanner({ selCount, onExportJPG, onCancel }) {
  return (
    <div className="export-banner">
      <span className="export-banner-label">Export mode</span>
      <span style={{ color: 'var(--tx2)', fontSize: 13 }}>Click nodes or drag to select</span>
      <span className="export-sel-pill">{selCount} selected</span>
      <button
        className="tb-btn primary"
        style={{ height: 30, padding: '0 12px', fontSize: 13 }}
        disabled={selCount === 0}
        onClick={onExportJPG}
      >
        <IconPhoto size={15} />
        Export JPG
      </button>
      <button
        className="tb-btn"
        style={{ height: 30, padding: '0 10px', fontSize: 13 }}
        onClick={onCancel}
      >
        <IconX size={15} />
        Cancel
      </button>
    </div>
  )
}
