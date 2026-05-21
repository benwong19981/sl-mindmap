import { useCallback } from 'react'

const H_GAP = 60
const V_GAP = 18

export function useLayout(nodes, collapsed, applyLayout) {
  const runLayout = useCallback(() => {
    const nodesCopy = JSON.parse(JSON.stringify(nodes))

    function rootId() {
      return Object.values(nodesCopy).find(n => !n.parent)?.id || null
    }

    function getChildren(id) {
      return Object.values(nodesCopy).filter(n => n.parent === id).map(n => n.id)
    }

    function nodeSize(id) {
      const el = document.querySelector(`.node[data-id="${id}"] .node-bubble`)
      if (el && el.offsetWidth > 0) return { w: el.offsetWidth, h: el.offsetHeight }
      const n = nodesCopy[id]
      const txt = (n.html || n.label || '').replace(/<[^>]+>/g, '')
      const lines = txt.split('\n')
      const ml = Math.max(...lines.map(l => l.length), 4)
      return { w: Math.max(88, ml * 7.8 + 36), h: Math.max(36, lines.length * 22 + 18) }
    }

    function subtreeH(id) {
      const { h } = nodeSize(id)
      const kids = getChildren(id).filter(c => nodesCopy[c] && !collapsed.has(id))
      if (!kids.length) return h + V_GAP
      const kidsH = kids.reduce((s, c) => s + subtreeH(c), 0)
      return Math.max(h + V_GAP, kidsH)
    }

    function placeTree(id, side, edgeX, midY) {
      const { w, h } = nodeSize(id)
      nodesCopy[id].x = side === 1 ? edgeX : edgeX - w
      nodesCopy[id].y = midY - h / 2

      const kids = getChildren(id).filter(c => nodesCopy[c] && !collapsed.has(id))
      if (!kids.length) return

      const nextEdge = side === 1
        ? edgeX + w + H_GAP
        : edgeX - w - H_GAP

      const totalH = kids.reduce((s, c) => s + subtreeH(c), 0)
      let curY = midY - totalH / 2
      kids.forEach(cid => {
        const sh = subtreeH(cid)
        placeTree(cid, side, nextEdge, curY + sh / 2)
        curY += sh
      })
    }

    const rid = rootId()
    if (!rid) return

    const { w: rw, h: rh } = nodeSize(rid)
    const CX = 700, CY = 400

    nodesCopy[rid].x = CX - rw / 2
    nodesCopy[rid].y = CY - rh / 2

    const topKids = getChildren(rid).filter(c => nodesCopy[c])
    const right = [], left = []
    topKids.forEach((id, i) => i % 2 === 0 ? right.push(id) : left.push(id))

    const rTotalH = right.reduce((s, c) => s + subtreeH(c), 0)
    const rEdgeX = CX + rw / 2 + H_GAP
    let ry = CY - rTotalH / 2
    right.forEach(cid => {
      const sh = subtreeH(cid)
      placeTree(cid, 1, rEdgeX, ry + sh / 2)
      ry += sh
    })

    const lTotalH = left.reduce((s, c) => s + subtreeH(c), 0)
    const lEdgeX = CX - rw / 2 - H_GAP
    let ly = CY - lTotalH / 2
    left.forEach(cid => {
      const sh = subtreeH(cid)
      placeTree(cid, -1, lEdgeX, ly + sh / 2)
      ly += sh
    })

    const positions = {}
    for (const [id, n] of Object.entries(nodesCopy)) {
      positions[id] = { x: n.x, y: n.y }
    }
    applyLayout(positions)
  }, [nodes, collapsed, applyLayout])

  return runLayout
}
