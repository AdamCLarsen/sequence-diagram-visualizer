import type { ColumnLayout } from '../layout/types'
import type { Theme } from './theme'

export function drawLifelines(
  ctx: CanvasRenderingContext2D,
  columns: ColumnLayout[],
  headerHeight: number,
  diagramHeight: number,
  theme: Theme,
  viewportBottom?: number,
): void {
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = theme.lifeline
  ctx.lineWidth = 1

  const bottom = Math.max(diagramHeight, viewportBottom ?? diagramHeight)

  for (const col of columns) {
    ctx.beginPath()
    ctx.moveTo(col.x, headerHeight)
    ctx.lineTo(col.x, bottom)
    ctx.stroke()
  }

  ctx.setLineDash([])
}
