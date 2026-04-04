import type { BlockLayout } from '../layout/types'
import type { Theme } from './theme'

export interface BlockViewport {
  camX: number
  canvasWidth: number
  zoom: number
}

export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: BlockLayout[],
  theme: Theme,
  viewport?: BlockViewport,
): void {
  for (const block of blocks) {
    if (block.type === 'note') {
      drawNote(ctx, block, theme, viewport)
    } else if (block.type === 'else') {
      drawElseDivider(ctx, block, theme)
    } else if (block.type === 'rect') {
      drawRectBlock(ctx, block, theme)
    } else {
      drawStructuralBlock(ctx, block, theme)
    }
  }
}

function drawRectBlock(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
  theme: Theme,
): void {
  if (!block.color) return

  // Adapt the fill color for the current background. Colors authored for
  // dark themes (e.g. rgba(255,255,255,0.06)) are invisible on light
  // backgrounds, so invert white→black in the rgba for light themes.
  ctx.fillStyle = adaptRectColor(block.color, theme)
  ctx.fillRect(block.x, block.y, block.width, block.height)

  // Subtle dashed border so rect regions stay visible
  ctx.strokeStyle = theme.blockBorder
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.strokeRect(block.x, block.y, block.width, block.height)
  ctx.setLineDash([])
  ctx.globalAlpha = 1.0
}

/** If an rgba color is near-white, remap it to near-black so it shows on light backgrounds. */
function adaptRectColor(color: string, theme: Theme): string {
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (!m) return color

  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]), a = Number(m[4] ?? 1)
  const isLightTheme = theme.background === '#ffffff' || theme.background === '#fff'

  // Near-white fill on a light background → invert to near-black
  if (isLightTheme && r > 200 && g > 200 && b > 200) {
    return `rgba(0, 0, 0, ${Math.min(a * 2, 0.15)})`
  }
  return color
}

function drawStructuralBlock(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
  theme: Theme,
): void {
  // Background
  ctx.fillStyle = theme.blockBackground
  ctx.fillRect(block.x, block.y, block.width, block.height)

  // Border
  ctx.strokeStyle = theme.blockBorder
  ctx.lineWidth = 1
  ctx.strokeRect(block.x, block.y, block.width, block.height)

  // Label tag
  const labelText = `${block.type} ${block.label}`
  ctx.font = theme.blockLabelFont
  const labelWidth = ctx.measureText(labelText).width + 12
  const tagHeight = 18

  ctx.fillStyle = theme.blockBorder
  ctx.beginPath()
  ctx.moveTo(block.x, block.y)
  ctx.lineTo(block.x + labelWidth, block.y)
  ctx.lineTo(block.x + labelWidth, block.y + tagHeight - 4)
  ctx.lineTo(block.x + labelWidth - 4, block.y + tagHeight)
  ctx.lineTo(block.x, block.y + tagHeight)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = theme.blockLabelFont
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(labelText, block.x + 6, block.y + tagHeight / 2)
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
  theme: Theme,
  viewport?: BlockViewport,
): void {
  const foldSize = 8

  // Note background with folded corner
  ctx.fillStyle = theme.noteBackground
  ctx.beginPath()
  ctx.moveTo(block.x, block.y)
  ctx.lineTo(block.x + block.width - foldSize, block.y)
  ctx.lineTo(block.x + block.width, block.y + foldSize)
  ctx.lineTo(block.x + block.width, block.y + block.height)
  ctx.lineTo(block.x, block.y + block.height)
  ctx.closePath()
  ctx.fill()

  // Border
  ctx.strokeStyle = theme.noteBorder
  ctx.lineWidth = 1
  ctx.stroke()

  // Fold triangle
  ctx.beginPath()
  ctx.moveTo(block.x + block.width - foldSize, block.y)
  ctx.lineTo(block.x + block.width - foldSize, block.y + foldSize)
  ctx.lineTo(block.x + block.width, block.y + foldSize)
  ctx.strokeStyle = theme.noteBorder
  ctx.stroke()

  // Text (supports <br/> line breaks)
  // For wide notes, clamp text to the visible viewport center
  ctx.font = theme.noteFont
  ctx.fillStyle = theme.noteText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let textX = block.x + block.width / 2
  if (viewport) {
    const viewLeft = viewport.camX
    const viewRight = viewport.camX + viewport.canvasWidth / viewport.zoom
    const visibleLeft = Math.max(block.x, viewLeft)
    const visibleRight = Math.min(block.x + block.width, viewRight)
    if (visibleRight > visibleLeft) {
      textX = (visibleLeft + visibleRight) / 2
    }
  }

  const lines = block.label.split(/<br\s*\/?>/)
  if (lines.length <= 1) {
    ctx.fillText(block.label, textX, block.y + block.height / 2, block.width - 10)
  } else {
    const lineHeight = 16
    const totalTextHeight = lines.length * lineHeight
    const startY = block.y + (block.height - totalTextHeight) / 2 + lineHeight / 2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), textX, startY + i * lineHeight, block.width - 10)
    }
  }
}

function drawElseDivider(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
  theme: Theme,
): void {
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = theme.blockBorder
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(block.x, block.y)
  ctx.lineTo(block.x + block.width, block.y)
  ctx.stroke()
  ctx.setLineDash([])

  if (block.label) {
    ctx.font = theme.blockLabelFont
    ctx.fillStyle = theme.blockLabel
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`[${block.label}]`, block.x + 10, block.y + 8)
  }
}
