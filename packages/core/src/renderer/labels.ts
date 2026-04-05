import type { RowLayout } from '../layout/types'
import type { Theme } from './theme'

const LABEL_PAD = 20
const SOURCE_ICON_W = 12
const SOURCE_ICON_H = 8
const SOURCE_ICON_PAD = 4

/** Draw a small participant-box icon (rounded rect) inline before/after the source label */
function drawSourceIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  color: string,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(x, centerY - SOURCE_ICON_H / 2, SOURCE_ICON_W, SOURCE_ICON_H, 2)
  ctx.stroke()
}

/** Draw a source participant annotation with icon */
function drawSourceAnnotation(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  isLeft: boolean,
  theme: Theme,
): number {
  ctx.font = theme.sourceLabelFont
  const textWidth = ctx.measureText(label).width
  const totalWidth = SOURCE_ICON_W + SOURCE_ICON_PAD + textWidth
  const pad = 3

  // Background
  ctx.fillStyle = theme.background
  ctx.globalAlpha = 0.85
  ctx.fillRect(x - pad, y - 10, totalWidth + pad * 2, 14)
  ctx.globalAlpha = 1.0

  // Icon then text (left-clamped) or text then icon (right-clamped)
  if (isLeft) {
    drawSourceIcon(ctx, x, y - 3, theme.sourceLabelText)
    ctx.fillStyle = theme.sourceLabelText
    ctx.font = theme.sourceLabelFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(label, x + SOURCE_ICON_W + SOURCE_ICON_PAD, y)
  } else {
    ctx.fillStyle = theme.sourceLabelText
    ctx.font = theme.sourceLabelFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(label, x, y)
    drawSourceIcon(ctx, x + textWidth + SOURCE_ICON_PAD, y - 3, theme.sourceLabelText)
  }

  return totalWidth
}

/** Compute x position so annotation is right-aligned to the edge */
function computeRightAlignedX(
  ctx: CanvasRenderingContext2D,
  label: string,
  rightEdge: number,
  theme: Theme,
): number {
  ctx.font = theme.sourceLabelFont
  const textW = ctx.measureText(label).width
  const totalW = SOURCE_ICON_W + SOURCE_ICON_PAD + textW
  return rightEdge - totalW
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  row: RowLayout,
  cameraX: number,
  viewportWidth: number,
  zoom: number,
  autonumber: boolean,
  theme: Theme,
  showOffscreenLabels = true,
  showSourceLabels = false,
): void {
  const viewLeft = cameraX + LABEL_PAD
  const viewRight = cameraX + viewportWidth / zoom - LABEL_PAD
  const viewLeftEdge = cameraX
  const viewRightEdge = cameraX + viewportWidth / zoom
  const leftEdge = cameraX + 4
  const rightEdge = cameraX + viewportWidth / zoom - 4

  // For label-less arrows, draw source/destination annotations if enabled
  if (!row.label.text) {
    if (!showSourceLabels) return
    const fromOffLeft = row.arrow.fromX < viewLeftEdge
    const fromOffRight = row.arrow.fromX > viewRightEdge
    const toOffLeft = row.arrow.toX < viewLeftEdge
    const toOffRight = row.arrow.toX > viewRightEdge
    const fromOff = fromOffLeft || fromOffRight
    const toOff = toOffLeft || toOffRight
    if (!fromOff && !toOff) return
    // Need at least one visible lifeline — don't annotate fully off-screen arrows
    const hasVisible =
      (row.arrow.fromX >= viewLeftEdge && row.arrow.fromX <= viewRightEdge) ||
      (row.arrow.toX >= viewLeftEdge && row.arrow.toX <= viewRightEdge)
    if (!hasVisible) return
    const arrowY = row.y + row.height / 2
    const srcY = arrowY - 8
    if (fromOff && row.fromLabel) {
      const annX = fromOffRight ? computeRightAlignedX(ctx, row.fromLabel, rightEdge, theme) : leftEdge
      drawSourceAnnotation(ctx, row.fromLabel, annX, srcY, fromOffLeft, theme)
    }
    if (toOff && row.toLabel) {
      const annX = toOffRight ? computeRightAlignedX(ctx, row.toLabel, rightEdge, theme) : leftEdge
      const toY = fromOff ? srcY + 14 : srcY
      drawSourceAnnotation(ctx, row.toLabel, annX, toY, toOffLeft, theme)
    }
    return
  }

  const midX = row.label.midX

  let drawX: number
  let text: string
  let isClamped = false

  // Check if either endpoint lifeline is visible on screen
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

  // Prevent text from being clipped by the visible edges
  if (x + textWidth > rightEdge) {
    x = rightEdge - textWidth
  }
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

  // Draw source/destination labels when lifelines are off-screen
  // Only show if at least one lifeline is visible (don't annotate fully off-screen arrows)
  if (showSourceLabels && hasVisibleLifeline) {
    const fromOffLeft = row.arrow.fromX < viewLeftEdge
    const fromOffRight = row.arrow.fromX > viewRightEdge
    const toOffLeft = row.arrow.toX < viewLeftEdge
    const toOffRight = row.arrow.toX > viewRightEdge
    const arrowY = row.y + row.height / 2
    // Stack above label when annotation is on the same side as the label text;
    // anchor to arrow line when they're on opposite sides (no overlap possible)
    const viewCenterX = cameraX + viewportWidth / zoom / 2
    const labelOnLeft = x + textWidth / 2 < viewCenterX
    let leftY = labelOnLeft ? row.label.y - 14 : arrowY - 8
    let rightY = !labelOnLeft ? row.label.y - 14 : arrowY - 8
    if ((fromOffLeft || fromOffRight) && row.fromLabel) {
      if (fromOffRight) {
        const annX = computeRightAlignedX(ctx, row.fromLabel, rightEdge, theme)
        drawSourceAnnotation(ctx, row.fromLabel, annX, rightY, false, theme)
        rightY -= 14
      } else {
        drawSourceAnnotation(ctx, row.fromLabel, leftEdge, leftY, true, theme)
        leftY -= 14
      }
    }
    if ((toOffLeft || toOffRight) && row.toLabel) {
      if (toOffRight) {
        const annX = computeRightAlignedX(ctx, row.toLabel, rightEdge, theme)
        drawSourceAnnotation(ctx, row.toLabel, annX, rightY, false, theme)
      } else {
        drawSourceAnnotation(ctx, row.toLabel, leftEdge, leftY, true, theme)
      }
    }
  }

  // Draw label text
  ctx.font = theme.labelFont
  ctx.fillStyle = isClamped ? theme.labelClampedText : theme.labelText
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, row.label.y)
}
