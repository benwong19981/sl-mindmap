import { useState, useEffect } from 'react'
import { IconTrash } from '@tabler/icons-react'

export default function Modal({ mode, onClose, onSave, onLoad, onDelete, listSaved }) {
  const [filename, setFilename] = useState('')
  const [savedMaps, setSavedMaps] = useState([])

  useEffect(() => {
    if (mode === 'open') {
      setSavedMaps(listSaved())
    }
  }, [mode, listSaved])

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch {
      return iso
    }
  }

  if (mode === 'save') {
    return (
      <div className="modal-backdrop" onMouseDown={handleBackdrop}>
        <div className="modal">
          <div className="modal-title">Save file</div>
          <input
            className="modal-input"
            autoFocus
            placeholder="Filename…"
            value={filename}
            onChange={e => setFilename(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && filename.trim()) onSave(filename.trim()) }}
          />
          <div className="modal-actions">
            <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
            <button
              className="modal-btn primary"
              disabled={!filename.trim()}
              onClick={() => onSave(filename.trim())}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'open') {
    return (
      <div className="modal-backdrop" onMouseDown={handleBackdrop}>
        <div className="modal">
          <div className="modal-title">Open saved map</div>
          <div className="modal-list">
            {savedMaps.length === 0 ? (
              <div className="modal-list-empty">No saved maps yet</div>
            ) : savedMaps.map(m => (
              <div
                key={m.title}
                className="modal-list-item"
                onClick={() => onLoad(m.title)}
              >
                <div className="modal-list-item-info">
                  <div className="modal-list-item-name">{m.title}</div>
                  <div className="modal-list-item-meta">
                    {formatDate(m.savedAt)} · {m.nodeCount || Object.keys(m.nodes || {}).length} nodes
                  </div>
                </div>
                <button
                  className="modal-trash-btn"
                  onClick={e => {
                    e.stopPropagation()
                    if (window.confirm(`Delete "${m.title}"?`)) {
                      onDelete(m.title)
                      setSavedMaps(prev => prev.filter(x => x.title !== m.title))
                    }
                  }}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
