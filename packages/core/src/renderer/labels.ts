import type { RowLayout } from '../layout/types'
import type { Theme } from './theme'

const LABEL_PAD = 20

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  row: RowLayout,
  cameraX: number,
  viewportWidth: number,
  zoom: number,
  autonumber: boolean,
  theme: Theme,
  showOffscreenLabels = true,
): void {
  if (!row.label.text) return

  const midX = row.label.midX
  const viewLeft = cameraX + LABEL_PAD
  const viewRight = cameraX + viewportWidth / zoom - LABEL_PAD

  let drawX: number
  let text: string
  let isClamped = false

  // Check if either endpoint lifeline is visible on screen
  const viewLeftEdge = cameraX
  const viewRightEdge = cameraX + viewportWidth / zoom
  const hasVisibleLifeline =
    (row.arrow.fromX >= viewLeftEdge && row.arrow.fromX <= viewRightEdge) ||
    (row.arrow.toX >= viewLeftEdge && row.arrow.toX <= viewRightEdge)

  if (midX < viewLeft) {
    if (!showOffscreenLabels && !hasVisibleLifeline) return
    drawX = viewLeft
    text = '\u2190 ' + row.label.text
    isClamped = true
  } else if (midX > viewRight) {
    if (!showOffscreenLabels && !hasVisibleLifeline) return
    drawX = viewRight
    text = row.label.text + ' \u2192'
    isClamped = true
  } else {
    drawX = midX
    text = row.label.text
  }

  ctx.font = theme.labelFont
  ctx.fillStyle = isClamped ? theme.labelClampedText : theme.labelText

  const textWidth = ctx.measureText(text).width
  const align = isClamped
    ? midX < viewLeft
      ? 'left'
      : 'right'
    : 'center'

  let x: number
  if (align === 'left') {
    x = drawX
  } else if (align === 'right') {
    x = drawX - textWidth
  } else {
    x = drawX - textWidth / 2
  }

  // Prevent text from being clipped by the visible left edge
  const leftEdge = cameraX + 4
  if (x < leftEdge) {
    x = leftEdge
  }

  // Background for readability
  const pad = 3
  ctx.fillStyle = theme.background
  ctx.globalAlpha = 0.85
  ctx.fillRect(x - pad, row.label.y - 12, textWidth + pad * 2, 16)
  ctx.globalAlpha = 1.0

  // Draw autonumber badge
  if (autonumber) {
    const badgeText = String(row.messageIndex + 1)
    ctx.font = theme.autonumberFont
    const badgeW = ctx.measureText(badgeText).width + 8
    const badgeH = 14
    const badgeX = x - badgeW - 4
    const badgeY = row.label.y - 11

    ctx.fillStyle = theme.autonumberBadge
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3)
    ctx.fill()

    ctx.fillStyle = theme.autonumberText
    ctx.font = theme.autonumberFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2)
  }

  // Draw label text
  ctx.font = theme.labelFont
  ctx.fillStyle = isClamped ? theme.labelClampedText : theme.labelText
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, row.label.y)
}
