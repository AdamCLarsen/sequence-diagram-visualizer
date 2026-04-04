import type { Camera } from './camera'
import type { LayoutModel } from '../layout/types'

const SCROLLBAR_SIZE = 8
const SCROLLBAR_MIN_THUMB = 30
const SCROLLBAR_MARGIN = 4
const SCROLLBAR_RADIUS = 4

export function drawScrollbars(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  layout: LayoutModel,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const viewW = canvasWidth / camera.zoom
  const viewH = canvasHeight / camera.zoom

  // Only show scrollbars when diagram exceeds viewport
  const showH = layout.width > viewW
  const showV = layout.height > viewH

  if (showV) {
    drawVerticalScrollbar(ctx, camera, layout, canvasWidth, canvasHeight)
  }

  if (showH) {
    drawHorizontalScrollbar(ctx, camera, layout, canvasWidth, canvasHeight)
  }
}

function drawVerticalScrollbar(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  layout: LayoutModel,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const trackX = canvasWidth - SCROLLBAR_SIZE - SCROLLBAR_MARGIN
  const trackY = SCROLLBAR_MARGIN
  const trackH = canvasHeight - SCROLLBAR_MARGIN * 2

  // Track
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
  ctx.beginPath()
  ctx.roundRect(trackX, trackY, SCROLLBAR_SIZE, trackH, SCROLLBAR_RADIUS)
  ctx.fill()

  // Thumb
  const viewH = canvasHeight / camera.zoom
  const ratio = Math.min(1, viewH / layout.height)
  const thumbH = Math.max(SCROLLBAR_MIN_THUMB, trackH * ratio)
  const scrollRange = layout.height - viewH
  const thumbY = scrollRange > 0
    ? trackY + (camera.y / scrollRange) * (trackH - thumbH)
    : trackY

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.beginPath()
  ctx.roundRect(trackX, thumbY, SCROLLBAR_SIZE, thumbH, SCROLLBAR_RADIUS)
  ctx.fill()
}

function drawHorizontalScrollbar(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  layout: LayoutModel,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const trackX = SCROLLBAR_MARGIN
  const trackY = canvasHeight - SCROLLBAR_SIZE - SCROLLBAR_MARGIN
  const trackW = canvasWidth - SCROLLBAR_MARGIN * 2

  // Track
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
  ctx.beginPath()
  ctx.roundRect(trackX, trackY, trackW, SCROLLBAR_SIZE, SCROLLBAR_RADIUS)
  ctx.fill()

  // Thumb
  const viewW = canvasWidth / camera.zoom
  const ratio = Math.min(1, viewW / layout.width)
  const thumbW = Math.max(SCROLLBAR_MIN_THUMB, trackW * ratio)
  const scrollRange = layout.width - viewW
  const thumbX = scrollRange > 0
    ? trackX + (camera.x / scrollRange) * (trackW - thumbW)
    : trackX

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.beginPath()
  ctx.roundRect(thumbX, trackY, thumbW, SCROLLBAR_SIZE, SCROLLBAR_RADIUS)
  ctx.fill()
}
