import type { LayoutModel } from '../layout/types'
import type { SequenceDiagramAST } from '../parser/types'
import type { Camera } from '../viewport/camera'
import type { Theme } from './theme'
import { drawArrow } from './arrows'
import { drawLabel } from './labels'
import { drawHeaders } from './headers'
import { drawLifelines } from './lifelines'
import { drawBlocks } from './blocks'
import { drawScrollbars } from '../viewport/scrollbars'

export function render(
  ctx: CanvasRenderingContext2D,
  layoutModel: LayoutModel,
  ast: SequenceDiagramAST,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
  theme: Theme,
): void {
  const { zoom, x: camX, y: camY } = camera

  // Clear
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // === Pass 1: Diagram Body ===
  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(-camX, -camY)

  // Lifelines
  drawLifelines(ctx, layoutModel.columns, layoutModel.headerHeight, layoutModel.height, theme)

  // Activation bars
  for (const act of layoutModel.activations) {
    ctx.fillStyle = theme.activationFill
    ctx.strokeStyle = theme.activationBorder
    ctx.lineWidth = 1
    const barW = 10
    ctx.fillRect(act.x, act.startY, barW, act.endY - act.startY)
    ctx.strokeRect(act.x, act.startY, barW, act.endY - act.startY)
  }

  // Structural blocks
  drawBlocks(ctx, layoutModel.blocks, theme)

  // Arrows and labels
  for (const row of layoutModel.rows) {
    drawArrow(ctx, row.arrow.fromX, row.arrow.toX, row.y + row.height / 2, row.arrow.type, theme)
    drawLabel(ctx, row, camX, canvasWidth, zoom, ast.autonumber, theme)
  }

  ctx.restore()

  // === Pass 2: Sticky Header ===
  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(-camX, 0)

  drawHeaders(ctx, layoutModel.columns, ast.participants, layoutModel.headerHeight, theme)

  ctx.restore()

  // === Pass 3: Screen Chrome ===
  drawScrollbars(ctx, camera, layoutModel, canvasWidth, canvasHeight)
}
