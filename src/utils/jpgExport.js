import { parseRuns, wrapLines, makeFont } from './htmlToRuns.js'

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

// Read the dominant text-align from the node's rendered DOM element.
// execCommand justify* writes inline style.textAlign on block descendants,
// so we search all descendants rather than walking up from the first child.
function getNodeTextAlign(nodeId) {
  const el = document.querySelector(`.node[data-id="${nodeId}"] .node-content`)
  if (!el) return 'left'

  function findAlign(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const inlineAlign = node.style?.textAlign
    if (inlineAlign && inlineAlign !== '' && inlineAlign !== 'start' && inlineAlign !== 'left') {
      return inlineAlign
    }
    for (const child of node.children) {
      const found = findAlign(child)
      if (found) return found
    }
    return null
  }

  return findAlign(el) || 'left'
}

function drawNodeText(ctx, node, x, y, w, h, fg) {
  const isRoot = node.color === 'root'
  // Match browser padding exactly: root uses padding:12px 22px, others use 8px 14px
  const padX = isRoot ? 22 : 14
  const padY = isRoot ? 12 : 8
  // Root text is 15px bold via CSS — approximate with bold + size override
  const rootBold = isRoot
  const rootSize = isRoot ? 15 : null

  const runs = parseRuns(node.html || node.label || '')
  const maxTextW = w - padX * 2 - 2
  const lines = wrapLines(runs, ctx, maxTextW)
  const align = getNodeTextAlign(node.id)

  // textBaseline = 'middle': we draw at the vertical centre of each line box.
  // This mirrors how the browser centres text within its line-height box.
  ctx.textBaseline = 'middle'
  let curY = y + padY  // start at the top padding edge, same as the browser

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]

    // Dominant font size for this line (determines line-height)
    let maxSize = rootSize ?? 14
    for (const run of line) {
      const s = FONT_SIZES[run.size] || 14
      if (s > maxSize) maxSize = s
    }
    const lh = maxSize * 1.4   // match CSS line-height: 1.4
    const lineY = curY + lh / 2 // vertical centre of this line (textBaseline=middle)

    // Measure full line width for alignment calculation.
    // MUST use makeFont() — the same function used by wrapLines — so widths match.
    let lineW = 0
    for (const run of line) {
      ctx.font = makeFont(run, rootBold, rootSize)
      lineW += ctx.measureText(run.text).width
    }

    let curX
    if (align === 'center') {
      curX = x + (w - lineW) / 2
    } else if (align === 'right') {
      curX = x + w - padX - lineW
    } else {
      curX = x + padX
    }

    for (const run of line) {
      const size = rootSize ?? (FONT_SIZES[run.size] || 14)
      ctx.font = makeFont(run, rootBold, rootSize)
      const rw = ctx.measureText(run.text).width
      ctx.fillStyle = run.color || fg
      ctx.fillText(run.text, curX, lineY)

      if (run.underline) {
        ctx.beginPath()
        ctx.moveTo(curX, lineY + size * 0.3)
        ctx.lineTo(curX + rw, lineY + size * 0.3)
        ctx.strokeStyle = run.color || fg
        ctx.lineWidth = 1
        ctx.stroke()
      }
      if (run.strike) {
        ctx.beginPath()
        ctx.moveTo(curX, lineY)
        ctx.lineTo(curX + rw, lineY)
        ctx.strokeStyle = run.color || fg
        ctx.lineWidth = 1
        ctx.stroke()
      }

      curX += rw
    }

    curY += lh
  }

  ctx.textBaseline = 'alphabetic' // reset so edge drawing is unaffected
}
