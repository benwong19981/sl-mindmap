// Parse rich-text HTML into flat text runs for canvas rendering
export function parseRuns(html) {
  if (!html) return [{ text: '', bold: false, italic: false, underline: false, color: null, size: 3 }]

  const temp = document.createElement('div')
  temp.innerHTML = html
  const runs = []

  function ensureNewline(state) {
    if (runs.length > 0 && runs[runs.length - 1].text !== '\n') {
      runs.push({ ...state, text: '\n' })
    }
  }

  function walk(node, state) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent
      if (text) runs.push({ ...state, text })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toUpperCase()
    const next = { ...state }

    if (tag === 'B' || tag === 'STRONG') next.bold = true
    if (tag === 'I' || tag === 'EM') next.italic = true
    if (tag === 'U') next.underline = true
    if (tag === 'S' || tag === 'STRIKE') next.strike = true
    if (tag === 'FONT') {
      if (node.color) next.color = node.color
      if (node.size) next.size = parseInt(node.size) || 3
    }
    if (tag === 'SPAN') {
      const style = node.style
      if (style.color) next.color = style.color
      if (style.fontWeight === 'bold') next.bold = true
      if (style.fontStyle === 'italic') next.italic = true
      if (style.textDecoration?.includes('underline')) next.underline = true
    }
    if (tag === 'BR') {
      runs.push({ ...state, text: '\n' })
      return
    }

    if (tag === 'OL' || tag === 'UL') {
      let counter = 0
      for (const child of node.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toUpperCase() === 'LI') {
          counter++
          const marker = tag === 'OL' ? `${counter}. ` : '• '
          runs.push({ ...next, text: marker })
          for (const liChild of child.childNodes) {
            walk(liChild, next)
          }
          runs.push({ ...next, text: '\n' })
        } else {
          walk(child, next)
        }
      }
      return
    }

    const isBlock = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3'].includes(tag)
    if (isBlock && node !== temp && runs.length > 0) ensureNewline(state)
    for (const child of node.childNodes) {
      walk(child, next)
    }
    if (isBlock && node !== temp) ensureNewline(state)
  }

  walk(temp, { bold: false, italic: false, underline: false, strike: false, color: null, size: 3 })

  // Remove leading and trailing newlines
  while (runs.length > 0 && runs[0].text === '\n') runs.shift()
  while (runs.length > 0 && runs[runs.length - 1].text === '\n') runs.pop()

  return runs.length ? runs : [{ text: '', bold: false, italic: false, underline: false, color: null, size: 3 }]
}

// Wrap runs into lines that fit within maxWidth on a canvas context
export function wrapLines(runs, ctx, maxWidth) {
  const lines = []
  let currentLine = []
  let currentWidth = 0

  const FONT_SIZES = { 1: 10, 2: 12, 3: 14, 4: 18, 5: 24, 6: 32 }

  function measureRun(run) {
    const size = FONT_SIZES[run.size] || 14
    ctx.font = `${run.italic ? 'italic ' : ''}${run.bold ? 'bold ' : ''}${size}px -apple-system, sans-serif`
    return ctx.measureText(run.text).width
  }

  for (const run of runs) {
    if (run.text === '\n') {
      lines.push(currentLine)
      currentLine = []
      currentWidth = 0
      continue
    }

    const words = run.text.split(' ')
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi] + (wi < words.length - 1 ? ' ' : '')
      const wordRun = { ...run, text: word }
      const w = measureRun(wordRun)

      if (currentWidth + w > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = [wordRun]
        currentWidth = w
      } else {
        currentLine.push(wordRun)
        currentWidth += w
      }
    }
  }

  if (currentLine.length > 0) lines.push(currentLine)

  return lines
}
