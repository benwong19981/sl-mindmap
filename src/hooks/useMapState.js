import { useReducer, useCallback } from 'react'
import { uid } from '../utils/uid.js'

const COLORS = ['blue', 'teal', 'coral', 'pink', 'amber', 'green', 'purple', 'gray']

function makeInitialState() {
  const rootId = uid()
  const ids = {
    root: rootId,
    m1: uid(), m2: uid(), m3: uid(), m4: uid(),
    s1a: uid(), s1b: uid(), s1c: uid(),
    s2a: uid(), s2b: uid(), s2c: uid(),
    s3a: uid(), s3b: uid(), s3c: uid(),
    s4a: uid(), s4b: uid(), s4c: uid(),
  }

  const nodes = {
    [ids.root]: { id: ids.root, label: 'Central Topic', html: 'Central Topic', x: 650, y: 370, color: 'root', parent: null },
    [ids.m1]: { id: ids.m1, label: 'Main Idea 1', html: 'Main Idea 1', x: 900, y: 200, color: 'blue', parent: ids.root },
    [ids.m2]: { id: ids.m2, label: 'Main Idea 2', html: 'Main Idea 2', x: 350, y: 280, color: 'teal', parent: ids.root },
    [ids.m3]: { id: ids.m3, label: 'Main Idea 3', html: 'Main Idea 3', x: 900, y: 460, color: 'coral', parent: ids.root },
    [ids.m4]: { id: ids.m4, label: 'Main Idea 4', html: 'Main Idea 4', x: 350, y: 520, color: 'purple', parent: ids.root },
    [ids.s1a]: { id: ids.s1a, label: 'Sub-idea A', html: 'Sub-idea A', x: 1100, y: 120, color: 'blue', parent: ids.m1 },
    [ids.s1b]: { id: ids.s1b, label: 'Sub-idea B', html: 'Sub-idea B', x: 1100, y: 200, color: 'blue', parent: ids.m1 },
    [ids.s1c]: { id: ids.s1c, label: 'Sub-idea C', html: 'Sub-idea C', x: 1100, y: 280, color: 'blue', parent: ids.m1 },
    [ids.s2a]: { id: ids.s2a, label: 'Sub-idea A', html: 'Sub-idea A', x: 100, y: 220, color: 'teal', parent: ids.m2 },
    [ids.s2b]: { id: ids.s2b, label: 'Sub-idea B', html: 'Sub-idea B', x: 100, y: 300, color: 'teal', parent: ids.m2 },
    [ids.s2c]: { id: ids.s2c, label: 'Sub-idea C', html: 'Sub-idea C', x: 100, y: 380, color: 'teal', parent: ids.m2 },
    [ids.s3a]: { id: ids.s3a, label: 'Sub-idea A', html: 'Sub-idea A', x: 1100, y: 380, color: 'coral', parent: ids.m3 },
    [ids.s3b]: { id: ids.s3b, label: 'Sub-idea B', html: 'Sub-idea B', x: 1100, y: 460, color: 'coral', parent: ids.m3 },
    [ids.s3c]: { id: ids.s3c, label: 'Sub-idea C', html: 'Sub-idea C', x: 1100, y: 540, color: 'coral', parent: ids.m3 },
    [ids.s4a]: { id: ids.s4a, label: 'Sub-idea A', html: 'Sub-idea A', x: 100, y: 460, color: 'purple', parent: ids.m4 },
    [ids.s4b]: { id: ids.s4b, label: 'Sub-idea B', html: 'Sub-idea B', x: 100, y: 540, color: 'purple', parent: ids.m4 },
    [ids.s4c]: { id: ids.s4c, label: 'Sub-idea C', html: 'Sub-idea C', x: 100, y: 620, color: 'purple', parent: ids.m4 },
  }

  const edges = [
    { from: ids.root, to: ids.m1 }, { from: ids.root, to: ids.m2 },
    { from: ids.root, to: ids.m3 }, { from: ids.root, to: ids.m4 },
    { from: ids.m1, to: ids.s1a }, { from: ids.m1, to: ids.s1b }, { from: ids.m1, to: ids.s1c },
    { from: ids.m2, to: ids.s2a }, { from: ids.m2, to: ids.s2b }, { from: ids.m2, to: ids.s2c },
    { from: ids.m3, to: ids.s3a }, { from: ids.m3, to: ids.s3b }, { from: ids.m3, to: ids.s3c },
    { from: ids.m4, to: ids.s4a }, { from: ids.m4, to: ids.s4b }, { from: ids.m4, to: ids.s4c },
  ]

  return { nodes, edges, collapsed: new Set() }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return action.state

    case 'ADD_CHILD': {
      const parentId = action.parentId
      const parent = state.nodes[parentId]
      if (!parent) return state
      const newId = uid()
      const childColor = parent.color === 'root' ? COLORS[Object.keys(state.nodes).length % COLORS.length] : parent.color
      const newNode = {
        id: newId,
        label: 'New Idea',
        html: 'New Idea',
        x: parent.x + 200,
        y: parent.y,
        color: childColor,
        parent: parentId,
      }
      return {
        ...state,
        nodes: { ...state.nodes, [newId]: newNode },
        edges: [...state.edges, { from: parentId, to: newId }],
      }
    }

    case 'ADD_SIBLING': {
      const sibId = action.nodeId
      const sib = state.nodes[sibId]
      if (!sib || !sib.parent) return state
      const parentId = sib.parent
      const parent = state.nodes[parentId]
      const newId = uid()
      const newNode = {
        id: newId,
        label: 'New Idea',
        html: 'New Idea',
        x: sib.x,
        y: sib.y + 60,
        color: sib.color,
        parent: parentId,
      }
      return {
        ...state,
        nodes: { ...state.nodes, [newId]: newNode },
        edges: [...state.edges, { from: parentId, to: newId }],
      }
    }

    case 'DELETE_NODE': {
      const id = action.id
      const node = state.nodes[id]
      if (!node || !node.parent) return state // can't delete root

      // Collect all descendant IDs
      function collectDescendants(nodeId) {
        const result = [nodeId]
        for (const n of Object.values(state.nodes)) {
          if (n.parent === nodeId) result.push(...collectDescendants(n.id))
        }
        return result
      }
      const toDelete = new Set(collectDescendants(id))

      const newNodes = {}
      for (const [nid, n] of Object.entries(state.nodes)) {
        if (!toDelete.has(nid)) newNodes[nid] = n
      }
      const newEdges = state.edges.filter(e => !toDelete.has(e.from) && !toDelete.has(e.to))
      const newCollapsed = new Set([...state.collapsed].filter(cid => !toDelete.has(cid)))

      return { ...state, nodes: newNodes, edges: newEdges, collapsed: newCollapsed }
    }

    case 'UPDATE_NODE': {
      const { id, ...updates } = action
      if (!state.nodes[id]) return state
      return {
        ...state,
        nodes: { ...state.nodes, [id]: { ...state.nodes[id], ...updates } },
      }
    }

    case 'MOVE_NODE': {
      const { id, x, y } = action
      if (!state.nodes[id]) return state
      return {
        ...state,
        nodes: { ...state.nodes, [id]: { ...state.nodes[id], x, y } },
      }
    }

    case 'APPLY_LAYOUT': {
      const newNodes = { ...state.nodes }
      for (const [id, pos] of Object.entries(action.positions)) {
        if (newNodes[id]) newNodes[id] = { ...newNodes[id], ...pos }
      }
      return { ...state, nodes: newNodes }
    }

    case 'TOGGLE_COLLAPSE': {
      const { id } = action
      const newCollapsed = new Set(state.collapsed)
      if (newCollapsed.has(id)) newCollapsed.delete(id)
      else newCollapsed.add(id)
      return { ...state, collapsed: newCollapsed }
    }

    case 'LOAD_MAP': {
      return {
        nodes: action.nodes,
        edges: action.edges,
        collapsed: new Set(action.collapsed || []),
      }
    }

    default:
      return state
  }
}

export function useMapState() {
  const [state, dispatch] = useReducer(reducer, null, makeInitialState)

  const addChild = useCallback((parentId) => dispatch({ type: 'ADD_CHILD', parentId }), [])
  const addSibling = useCallback((nodeId) => dispatch({ type: 'ADD_SIBLING', nodeId }), [])
  const deleteNode = useCallback((id) => dispatch({ type: 'DELETE_NODE', id }), [])
  const updateNode = useCallback((id, updates) => dispatch({ type: 'UPDATE_NODE', id, ...updates }), [])
  const moveNode = useCallback((id, x, y) => dispatch({ type: 'MOVE_NODE', id, x, y }), [])
  const applyLayout = useCallback((positions) => dispatch({ type: 'APPLY_LAYOUT', positions }), [])
  const toggleCollapse = useCallback((id) => dispatch({ type: 'TOGGLE_COLLAPSE', id }), [])
  const loadMap = useCallback((nodes, edges, collapsed) => dispatch({ type: 'LOAD_MAP', nodes, edges, collapsed }), [])
  const setState = useCallback((s) => dispatch({ type: 'SET_STATE', state: s }), [])

  function getRootId() {
    return Object.values(state.nodes).find(n => !n.parent)?.id || null
  }

  function getChildren(id) {
    return Object.values(state.nodes).filter(n => n.parent === id).map(n => n.id)
  }

  return {
    nodes: state.nodes,
    edges: state.edges,
    collapsed: state.collapsed,
    addChild,
    addSibling,
    deleteNode,
    updateNode,
    moveNode,
    applyLayout,
    toggleCollapse,
    loadMap,
    setState,
    getRootId,
    getChildren,
  }
}
