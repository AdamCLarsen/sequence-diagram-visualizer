import type { ParticipantBoxLayout } from '../layout/types'

export function drawParticipantBoxes(
  ctx: CanvasRenderingContext2D,
  boxes: ParticipantBoxLayout[],
  viewportTop: number,
  viewportBottom: number,
  diagramHeight: number,
): void {
  const top = Math.min(0, viewportTop)
  const bottom = Math.max(diagramHeight, viewportBottom)

  for (const box of boxes) {
    if (!box.color) continue
    ctx.fillStyle = box.color
    ctx.fillRect(box.x, top, box.width, bottom - top)
  }
}
