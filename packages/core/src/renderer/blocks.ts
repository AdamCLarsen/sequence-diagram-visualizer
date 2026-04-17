import type { BlockLayout } from '../layout/types'
import type { Theme } from './theme'

export interface BlockViewport {
  camX: number
  canvasWidth: number
  zoom: number
}

export type BlockPhase = 'background' | 'overlay' | 'all'

export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: BlockLayout[],
  theme: Theme,
  viewport?: BlockViewport,
  showDiagramColors = true,
  phase: BlockPhase = 'all',
): void {
  const drawBg = phase === 'background' || phase === 'all'
  const drawFg = phase === 'overlay' || phase === 'all'

  // Paint backgrounds outer-to-inner so an outer rect/block fill doesn't
  // cover the borders or tinted fill of blocks nested inside it.
  if (drawBg) {
    const bgOrdered = [...blocks].sort((a, b) => a.depth - b.depth)
    for (const block of bgOrdered) {
      if (block.type === 'rect') {
        if (showDiagramColors) drawRectBlock(ctx, block, theme)
      } else if (block.type !== 'note' && block.type !== 'else') {
        drawStructuralBlockBackground(ctx, block, theme)
      }
    }
  }

  if (drawFg) {
    for (const block of blocks) {
      if (block.type === 'note') {
        drawNote(ctx, block, theme, viewport)
      } else if (block.type === 'else') {
        drawElseDivider(ctx, block, theme)
      } else if (block.type !== 'rect') {
        drawStructuralBlockTag(ctx, block, theme, viewport)
      }
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
  const bg = theme.background.toLowerCase()
  const isLightTheme = bg === '#ffffff' || bg === '#fff' || bg === '#fafafa'

  // Near-white fill on a light background → invert to near-black
  if (isLightTheme && r > 200 && g > 200 && b > 200) {
    return `rgba(0, 0, 0, ${Math.min(a * 2, 0.15)})`
  }
  return color
}

function drawStructuralBlockBackground(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
  theme: Theme,
): void {
  ctx.fillStyle = theme.blockBackground
  ctx.fillRect(block.x, block.y, block.width, block.height)

  ctx.strokeStyle = theme.blockBorder
  ctx.lineWidth = 1
  ctx.strokeRect(block.x, block.y, block.width, block.height)
}

function drawStructuralBlockTag(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
  theme: Theme,
  viewport?: BlockViewport,
): void {
  // Tag group: [type | label] — sticky to viewport left edge
  const tagHeight = 18
  const pad = 6
  ctx.font = theme.blockLabelFont
  const typeText = block.type
  const typeWidth = ctx.measureText(typeText).width + pad * 2

  if (block.label) {
    ctx.font = theme.blockTagLabelFont
    const labelWidth = ctx.measureText(block.label).width + pad * 2
    const totalTagWidth = typeWidth + labelWidth

    // Sticky: pin to viewport left, but never past block right edge
    let tagX = block.x
    if (viewport) {
      const viewLeft = viewport.camX
      const maxTagX = block.x + block.width - totalTagWidth
      tagX = Math.max(block.x, Math.min(viewLeft, maxTagX))
    }

    // Type segment (strong)
    ctx.fillStyle = theme.blockBorder
    ctx.fillRect(tagX, block.y, typeWidth, tagHeight)

    // Label segment (muted)
    ctx.fillStyle = theme.blockTagLabelBackground
    ctx.beginPath()
    ctx.moveTo(tagX + typeWidth, block.y)
    ctx.lineTo(tagX + typeWidth + labelWidth, block.y)
    ctx.lineTo(tagX + typeWidth + labelWidth, block.y + tagHeight - 4)
    ctx.lineTo(tagX + typeWidth + labelWidth - 4, block.y + tagHeight)
    ctx.lineTo(tagX + typeWidth, block.y + tagHeight)
    ctx.closePath()
    ctx.fill()

    // Type text
    ctx.fillStyle = '#ffffff'
    ctx.font = theme.blockLabelFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(typeText, tagX + pad, block.y + tagHeight / 2)

    // Label text
    ctx.fillStyle = theme.blockTagLabelText
    ctx.font = theme.blockTagLabelFont
    ctx.fillText(block.label, tagX + typeWidth + pad, block.y + tagHeight / 2)
  } else {
    // Type-only tag with angled corner — also sticky
    let tagX = block.x
    if (viewport) {
      const viewLeft = viewport.camX
      const maxTagX = block.x + block.width - typeWidth
      tagX = Math.max(block.x, Math.min(viewLeft, maxTagX))
    }

    ctx.fillStyle = theme.blockBorder
    ctx.beginPath()
    ctx.moveTo(tagX, block.y)
    ctx.lineTo(tagX + typeWidth, block.y)
    ctx.lineTo(tagX + typeWidth, block.y + tagHeight - 4)
    ctx.lineTo(tagX + typeWidth - 4, block.y + tagHeight)
    ctx.lineTo(tagX, block.y + tagHeight)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = theme.blockLabelFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(typeText, tagX + pad, block.y + tagHeight / 2)
  }
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
