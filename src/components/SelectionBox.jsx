export default function SelectionBox({ rect }) {
  if (!rect) return null

  return (
    <div
      className="selection-box"
      style={{
        left: Math.min(rect.x1, rect.x2),
        top: Math.min(rect.y1, rect.y2),
        width: Math.abs(rect.x2 - rect.x1),
        height: Math.abs(rect.y2 - rect.y1),
      }}
    />
  )
}
