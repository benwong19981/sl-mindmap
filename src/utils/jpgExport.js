import { parseRuns, wrapLines } from './htmlToRuns.js'

const NODE_BG = {
  root: '#185FA5', blue: '#E6F1FB', teal: '#E1F5EE', coral: '#FAECE7',
  pink: '#FBEAF0', amber: '#FAEEDA', green: '#EAF3DE', purple: '#EEEDFE', gray: '#F1EFE8'
}
const NODE_FG = {
  root: '#ffffff', blue: '#0C447C', teal: '#085041', coral: '#712B13',
  pink: '#72243E', amber: '#633806', green: '#27500A', purple: '#3C3489', gray: '#444441'
}
const EDGE_COLORS = {
  root: '#185FA5', blue: '#378ADD', teal: '#1D9E75',
  coral: '#D85A30', pink: '#D4537E', amber: '#BA7517',
  green: '#639922', purple: '#7F77DD', gray: '#888780'
}

const FONT_SIZES = { 1: 10, 2: 12, 3: 14, 4: 18, 5: 24, 6: 32 }

export function exportToJPG(ids, nodes, edges, mapTitle) {
  const PAD = 44
  const SCALE = 2

  // Measure actual rendered bubble sizes from DOM
  const sizes = {}
  const positions = {}

  for (const id of ids) {
    const el = document.querySelector(`.node[data-id="${id}"] .node-bubble`)
    if (el) {
      const rect = el.getBoundingClientRect()
      sizes[id] = { w: el.offsetWidth, h: el.offsetHeight }
    } else {
      const n = nodes[id]
      const txt = (n.html || n.label || '').replace(/<[^>]+>/g, '')
      const lines = txt.split('\n')
      const ml = Math.max(...lines.map(l => l.length), 4)
      sizes[id] = { w: Math.max(88, ml * 7.8 + 36), h: Math.max(36, lines.length * 22 + 18) }
    }
    positions[id] = { x: nodes[id].x, y: nodes[id].y }
  }

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const id of ids) {
    const { x, y } = positions[id]
    const { w, h } = sizes[id]
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  const W = maxX - minX + PAD * 2
  const H = maxY - minY + PAD * 2
  const offX = minX - PAD
  const offY = minY - PAD

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Draw edges between selected nodes
  const idSet = new Set(ids)
  for (const edge of edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue
    const fromNode = nodes[edge.from]
    const toNode = nodes[edge.to]
    if (!fromNode || !toNode) continue

    const fromSize = sizes[edge.from]
    const toSize = sizes[edge.to]

    const ax = (fromNode.x - offX) + fromSize.w / 2
    const ay = (fromNode.y - offY) + fromSize.h / 2
    const bx = (toNode.x - offX) + toSize.w / 2
    const by = (toNode.y - offY) + toSize.h / 2
    const mx = (ax + bx) / 2

    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.bezierCurveTo(mx, ay, mx, by, bx, by)
    ctx.strokeStyle = EDGE_COLORS[fromNode.color] || '#378ADD'
    ctx.lineWidth = fromNode.color === 'root' ? 2.5 : 2
    ctx.globalAlpha = fromNode.color === 'root' ? 1 : 0.55
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Draw nodes
  for (const id of ids) {
    const node = nodes[id]
    const { w, h } = sizes[id]
    const x = node.x - offX
    const y = node.y - offY

    const bg = NODE_BG[node.color] || NODE_BG.blue
    const fg = NODE_FG[node.color] || NODE_FG.blue
    const radius = node.color === 'root' ? Math.min(h / 2, 999) : 14

    // Draw bubble
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, radius)
    } else {
      roundRectPath(ctx, x, y, w, h, radius)
    }
    ctx.fillStyle = bg
    ctx.fill()

    // Draw text
    drawNodeText(ctx, node, x, y, w, h, fg)
  }

  // Download
  const link = document.createElement('a')
  link.download = `${mapTitle || 'mindmap'}.jpg`
  link.href = canvas.toDataURL('image/jpeg', 0.95)
  link.click()
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// Read the dominant text-align from the node's rendered DOM element
function getNodeTextAlign(nodeId) {
  const el = document.querySelector(`.node[data-id="${nodeId}"] .node-content`)
  if (!el) return 'left'
  // Walk up to find explicit text-align (set by execCommand justify*)
  let target = el.firstElementChild || el
  while (target && target !== el.parentElement) {
    const align = window.getComputedStyle(target).textAlign
    if (align && align !== 'start' && align !== 'left') return align
    // Also check inline style directly (execCommand writes inline styles)
    if (target.style?.textAlign) return target.style.textAlign
    target = target.parentElement
  }
  return 'left'
}

function drawNodeText(ctx, node, x, y, w, h, fg) {
  const runs = parseRuns(node.html || node.label || '')
  const padX = 14
  const maxTextW = w - padX * 2
  const lines = wrapLines(runs, ctx, maxTextW)
  const align = getNodeTextAlign(node.id)

  const lineHeights = lines.map(line => {
    let maxSize = 14
    for (const run of line) {
      const s = FONT_SIZES[run.size] || 14
      if (s > maxSize) maxSize = s
    }
    return maxSize * 1.35
  })

  const totalH = lineHeights.reduce((s, lh) => s + lh, 0)
  let curY = y + (h - totalH) / 2

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const lh = lineHeights[li]
    curY += lh

    // Measure line width to compute x start based on alignment
    let lineW = 0
    for (const run of line) {
      const size = FONT_SIZES[run.size] || 14
      ctx.font = `${run.italic ? 'italic ' : ''}${run.bold ? 'bold ' : ''}${size}px -apple-system, BlinkMacSystemFont, sans-serif`
      lineW += ctx.measureText(run.text).width
    }

    let curX
    if (align === 'center') {
      curX = x + (w - lineW) / 2
    } else if (align === 'right') {
      curX = x + w - padX - lineW
    } else {
      curX = x + padX  // left (default)
    }

    for (const run of line) {
      const size = FONT_SIZES[run.size] || 14
      ctx.font = `${run.italic ? 'italic ' : ''}${run.bold ? 'bold ' : ''}${size}px -apple-system, BlinkMacSystemFont, sans-serif`
      ctx.fillStyle = run.color || fg
      ctx.fillText(run.text, curX, curY)

      const rw = ctx.measureText(run.text).width

      if (run.underline) {
        ctx.beginPath()
        ctx.moveTo(curX, curY + 2)
        ctx.lineTo(curX + rw, curY + 2)
        ctx.strokeStyle = run.color || fg
        ctx.lineWidth = 1
        ctx.stroke()
      }
      if (run.strike) {
        ctx.beginPath()
        ctx.moveTo(curX, curY - size * 0.35)
        ctx.lineTo(curX + rw, curY - size * 0.35)
        ctx.strokeStyle = run.color || fg
        ctx.lineWidth = 1
        ctx.stroke()
      }

      curX += rw
    }
  }
}
