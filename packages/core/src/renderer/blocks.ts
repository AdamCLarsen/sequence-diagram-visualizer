import type { BlockLayout } from '../layout/types'
import type { Theme } from './theme'

export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: BlockLayout[],
  theme: Theme,
): void {
  for (const block of blocks) {
    if (block.type === 'note') {
      drawNote(ctx, block, theme)
    } else if (block.type === 'else') {
      drawElseDivider(ctx, block, theme)
    } else if (block.type === 'rect') {
      drawRectBlock(ctx, block)
    } else {
      drawStructuralBlock(ctx, block, theme)
    }
  }
}

function drawRectBlock(
  ctx: CanvasRenderingContext2D,
  block: BlockLayout,
): void {
  if (!block.color) return
  ctx.fillStyle = block.color
  ctx.fillRect(block.x, block.y, block.width, block.height)
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
  ctx.font = theme.noteFont
  ctx.fillStyle = theme.noteText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = block.label.split(/<br\s*\/?>/)
  if (lines.length <= 1) {
    ctx.fillText(block.label, block.x + block.width / 2, block.y + block.height / 2, block.width - 10)
  } else {
    const lineHeight = 16
    const totalTextHeight = lines.length * lineHeight
    const startY = block.y + (block.height - totalTextHeight) / 2 + lineHeight / 2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), block.x + block.width / 2, startY + i * lineHeight, block.width - 10)
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
