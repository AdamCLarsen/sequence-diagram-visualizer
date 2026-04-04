import type { ArrowType } from '../parser/types'
import type { Theme } from './theme'

const ARROWHEAD_SIZE = 8

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  toX: number,
  y: number,
  type: ArrowType,
  theme: Theme,
): void {
  const isDashed = type.startsWith('--')
  const isLost = type.endsWith('x') || type.endsWith('X')
  const isAsync = type.endsWith(')') || type.endsWith(')')
  const isOpen = type === '->' || type === '-->'

  // Self-message (from === to)
  if (fromX === toX) {
    drawSelfArrow(ctx, fromX, y, isDashed, theme)
    return
  }

  // Line style
  ctx.beginPath()
  if (isDashed) {
    ctx.setLineDash([6, 3])
    ctx.strokeStyle = theme.arrowDashed
  } else {
    ctx.setLineDash([])
    ctx.strokeStyle = theme.arrowSolid
  }

  if (isLost) {
    ctx.strokeStyle = theme.arrowLost
  }

  ctx.lineWidth = 1.5
  ctx.moveTo(fromX, y)
  ctx.lineTo(toX, y)
  ctx.stroke()
  ctx.setLineDash([])

  // Arrowhead
  const dir = toX > fromX ? 1 : -1

  if (isLost) {
    // X mark at end
    const cx = toX
    const s = 5
    ctx.beginPath()
    ctx.strokeStyle = theme.arrowLost
    ctx.lineWidth = 2
    ctx.moveTo(cx - s, y - s)
    ctx.lineTo(cx + s, y + s)
    ctx.moveTo(cx + s, y - s)
    ctx.lineTo(cx - s, y + s)
    ctx.stroke()
  } else if (isAsync) {
    // Open arrowhead (single line)
    ctx.beginPath()
    ctx.strokeStyle = isDashed ? theme.arrowDashed : theme.arrowSolid
    ctx.lineWidth = 1.5
    ctx.moveTo(toX - dir * ARROWHEAD_SIZE, y - ARROWHEAD_SIZE / 2)
    ctx.lineTo(toX, y)
    ctx.lineTo(toX - dir * ARROWHEAD_SIZE, y + ARROWHEAD_SIZE / 2)
    ctx.stroke()
  } else if (isOpen) {
    // Open arrowhead (V shape)
    ctx.beginPath()
    ctx.strokeStyle = isDashed ? theme.arrowDashed : theme.arrowSolid
    ctx.lineWidth = 1.5
    ctx.moveTo(toX - dir * ARROWHEAD_SIZE, y - ARROWHEAD_SIZE / 2)
    ctx.lineTo(toX, y)
    ctx.lineTo(toX - dir * ARROWHEAD_SIZE, y + ARROWHEAD_SIZE / 2)
    ctx.stroke()
  } else {
    // Filled arrowhead
    ctx.beginPath()
    ctx.fillStyle = isDashed ? theme.arrowDashed : theme.arrowSolid
    ctx.moveTo(toX, y)
    ctx.lineTo(toX - dir * ARROWHEAD_SIZE, y - ARROWHEAD_SIZE / 2)
    ctx.lineTo(toX - dir * ARROWHEAD_SIZE, y + ARROWHEAD_SIZE / 2)
    ctx.closePath()
    ctx.fill()
  }
}

function drawSelfArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isDashed: boolean,
  theme: Theme,
): void {
  const loopWidth = 30
  const loopHeight = 20

  ctx.beginPath()
  if (isDashed) {
    ctx.setLineDash([6, 3])
    ctx.strokeStyle = theme.arrowDashed
  } else {
    ctx.setLineDash([])
    ctx.strokeStyle = theme.arrowSolid
  }
  ctx.lineWidth = 1.5

  ctx.moveTo(x, y)
  ctx.lineTo(x + loopWidth, y)
  ctx.lineTo(x + loopWidth, y + loopHeight)
  ctx.lineTo(x, y + loopHeight)
  ctx.stroke()
  ctx.setLineDash([])

  // Arrowhead pointing left
  ctx.beginPath()
  ctx.fillStyle = isDashed ? theme.arrowDashed : theme.arrowSolid
  ctx.moveTo(x, y + loopHeight)
  ctx.lineTo(x + ARROWHEAD_SIZE, y + loopHeight - ARROWHEAD_SIZE / 2)
  ctx.lineTo(x + ARROWHEAD_SIZE, y + loopHeight + ARROWHEAD_SIZE / 2)
  ctx.closePath()
  ctx.fill()
}
