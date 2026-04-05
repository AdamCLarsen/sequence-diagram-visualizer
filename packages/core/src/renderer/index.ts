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
  showSourceLabels?: boolean
  showDiagramColors?: boolean
  selectedParticipants?: Set<string>
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
  const selected = renderOptions.selectedParticipants
  const DIM_ALPHA = 0.2

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
  const showColors = renderOptions.showDiagramColors ?? true
  drawParticipantBoxes(ctx, layoutModel.participantBoxes, viewportTop, viewportBottom, layoutModel.height, showColors)

  // Lifelines — extend from visible top to visible bottom
  const lifelineStart = Math.min(layoutModel.headerHeight, viewportTop)
  drawLifelines(ctx, layoutModel.columns, lifelineStart, layoutModel.height, theme, viewportBottom, selected)

  // Activation bars
  for (const act of layoutModel.activations) {
    const dimAct = selected && !selected.has(act.participantId)
    if (dimAct) ctx.globalAlpha = DIM_ALPHA
    ctx.fillStyle = theme.activationFill
    ctx.strokeStyle = theme.activationBorder
    ctx.lineWidth = 1.5
    const barW = 10
    ctx.fillRect(act.x, act.startY, barW, act.endY - act.startY)
    ctx.strokeRect(act.x, act.startY, barW, act.endY - act.startY)
    if (dimAct) ctx.globalAlpha = 1.0
  }

  // Structural blocks
  drawBlocks(ctx, layoutModel.blocks, theme, { camX, canvasWidth, zoom }, showColors)

  // Arrows and labels (skip spacer rows — they have both arrow endpoints at 0)
  // Use CSS viewport width (not device pixels) for correct world-space calculations
  const dpr = window.devicePixelRatio || 1
  const cssViewportWidth = canvasWidth / dpr
  for (const row of layoutModel.rows) {
    if (row.arrow.fromX === 0 && row.arrow.toX === 0) continue
    const dimRow = selected && !selected.has(row.fromId) && !selected.has(row.toId)
    if (dimRow) ctx.globalAlpha = DIM_ALPHA
    drawArrow(ctx, row.arrow.fromX, row.arrow.toX, row.y + row.height / 2, row.arrow.type, theme)
    const showSource = renderOptions.showSourceLabels ?? false
    if (row.label.text || showSource) {
      drawLabel(ctx, row, camX, cssViewportWidth, zoom, ast.autonumber, theme, showSource)
    }
    if (dimRow) ctx.globalAlpha = 1.0
  }

  ctx.restore()

  // === Pass 2: Sticky Header ===
  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(-camX, 0)

  drawHeaders(ctx, layoutModel.columns, ast.participants, layoutModel.headerHeight, theme, camX, canvasWidth, zoom, layoutModel.participantBoxes, showColors, selected)

  ctx.restore()

  // === Pass 3: Screen Chrome ===
  drawScrollbars(ctx, camera, layoutModel, canvasWidth, canvasHeight)
}
