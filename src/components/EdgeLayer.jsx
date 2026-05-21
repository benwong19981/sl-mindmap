import { useEffect, useRef, useState } from 'react'

const EDGE_COLORS = {
  root: '#185FA5', blue: '#378ADD', teal: '#1D9E75',
  coral: '#D85A30', pink: '#D4537E', amber: '#BA7517',
  green: '#639922', purple: '#7F77DD', gray: '#888780'
}

export default function EdgeLayer({ nodes, edges, collapsed, renderTick }) {
  const [paths, setPaths] = useState([])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const result = []

      // Collect all visible node IDs (excluding children of collapsed nodes)
      function isVisible(id) {
        const node = nodes[id]
        if (!node) return false
        if (!node.parent) return true
        if (collapsed.has(node.parent)) return false
        return isVisible(node.parent)
      }

      for (const edge of edges) {
        const fromNode = nodes[edge.from]
        const toNode = nodes[edge.to]
        if (!fromNode || !toNode) continue
        if (!isVisible(edge.from) || !isVisible(edge.to)) continue

        const fromEl = document.querySelector(`.node[data-id="${edge.from}"] .node-bubble`)
        const toEl = document.querySelector(`.node[data-id="${edge.to}"] .node-bubble`)

        if (!fromEl || !toEl) continue

        const fw = fromEl.offsetWidth
        const fh = fromEl.offsetHeight
        const tw = toEl.offsetWidth
        const th = toEl.offsetHeight

        const ax = fromNode.x + fw / 2
        const ay = fromNode.y + fh / 2
        const bx = toNode.x + tw / 2
        const by = toNode.y + th / 2
        const mx = (ax + bx) / 2

        const d = `M ${ax},${ay} C ${mx},${ay} ${mx},${by} ${bx},${by}`
        const color = EDGE_COLORS[fromNode.color] || '#378ADD'
        const strokeWidth = fromNode.color === 'root' ? 2.5 : 2
        const opacity = fromNode.color === 'root' ? 1 : 0.55

        result.push({ key: `${edge.from}-${edge.to}`, d, color, strokeWidth, opacity })
      }

      setPaths(result)
    })

    return () => cancelAnimationFrame(frame)
  }, [nodes, edges, collapsed, renderTick])

  return (
    <svg id="sl" xmlns="http://www.w3.org/2000/svg">
      {paths.map(p => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={p.strokeWidth}
          opacity={p.opacity}
        />
      ))}
    </svg>
  )
}
