import type { LayoutModel } from '../layout/types'
import type { SequenceDiagramAST } from '../parser/types'
import type { Camera } from '../viewport/camera'
import type { Theme } from './theme'
import { drawArrow } from './arrows'
import { drawLabel } from './labels'
import { drawHeaders } from './headers'
import { drawLifelines } from './lifelines'
import { drawBlocks } from './blocks'
import { drawParticipantBoxes } from './participant-boxes'
import { drawScrollbars } from '../viewport/scrollbars'

export interface RenderOptions {
  showOffscreenLabels?: boolean
}

export function render(
  ctx: CanvasRenderingContext2D,
  layoutModel: LayoutModel,
  ast: SequenceDiagramAST,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
  theme: Theme,
  renderOptions: RenderOptions = {},
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

  const viewportTop = camY
  const viewportBottom = camY + canvasHeight / zoom

  // Participant box backgrounds — full height colored strips
  drawParticipantBoxes(ctx, layoutModel.participantBoxes, viewportTop, viewportBottom, layoutModel.height)

  // Lifelines — extend from visible top to visible bottom
  const lifelineStart = Math.min(layoutModel.headerHeight, viewportTop)
  drawLifelines(ctx, layoutModel.columns, lifelineStart, layoutModel.height, theme, viewportBottom)

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

  // Arrows and labels (skip spacer rows with no label text)
  for (const row of layoutModel.rows) {
    if (!row.label.text) continue
    drawArrow(ctx, row.arrow.fromX, row.arrow.toX, row.y + row.height / 2, row.arrow.type, theme)
    drawLabel(ctx, row, camX, canvasWidth, zoom, ast.autonumber, theme, renderOptions.showOffscreenLabels ?? true)
  }

  ctx.restore()

  // === Pass 2: Sticky Header ===
  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(-camX, 0)

  drawHeaders(ctx, layoutModel.columns, ast.participants, layoutModel.headerHeight, theme, camX, canvasWidth, zoom, layoutModel.participantBoxes)

  ctx.restore()

  // === Pass 3: Screen Chrome ===
  drawScrollbars(ctx, camera, layoutModel, canvasWidth, canvasHeight)
}
