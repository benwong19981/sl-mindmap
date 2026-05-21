import { IconFocusCentered } from '@tabler/icons-react'

export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit }) {
  return (
    <div className="zoom-controls">
      <button className="zoom-btn" title="Zoom out" onClick={onZoomOut}>−</button>
      <span className="zoom-label">{Math.round(zoom * 100)}%</span>
      <button className="zoom-btn" title="Zoom in" onClick={onZoomIn}>+</button>
      <button className="zoom-btn" title="Fit to screen" onClick={onFit}>
        <IconFocusCentered size={16} />
      </button>
    </div>
  )
}
