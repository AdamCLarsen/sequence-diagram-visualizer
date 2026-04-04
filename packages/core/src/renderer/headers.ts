import type { ColumnLayout, ParticipantBoxLayout } from '../layout/types'
import type { Participant } from '../parser/types'
import type { Theme } from './theme'

const BOX_HEIGHT = 36
const BOX_RADIUS = 4

export function drawHeaders(
  ctx: CanvasRenderingContext2D,
  columns: ColumnLayout[],
  participants: Participant[],
  headerHeight: number,
  theme: Theme,
  camX?: number,
  canvasWidth?: number,
  zoom?: number,
  participantBoxes?: ParticipantBoxLayout[],
): void {
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Opaque header background — must cover the full visible viewport
  const z = zoom ?? 1
  const cx = camX ?? 0
  const viewWidth = (canvasWidth ?? 4000) / z
  ctx.fillStyle = theme.headerBackground
  ctx.fillRect(cx - 10, 0, viewWidth + 20, headerHeight)

  // Draw participant box backgrounds in header area
  if (participantBoxes) {
    for (const box of participantBoxes) {
      if (!box.color) continue
      ctx.fillStyle = box.color
      ctx.fillRect(box.x, 0, box.width, headerHeight)
    }
  }

  // Participant boxes
  for (const col of columns) {
    const participant = participantMap.get(col.participantId)
    const isActor = participant?.type === 'actor'

    const boxY = (headerHeight - BOX_HEIGHT) / 2

    if (isActor) {
      drawActorIcon(ctx, col.x, boxY + BOX_HEIGHT / 2, theme)
    } else {
      // Rectangle box
      ctx.fillStyle = theme.participantBox
      ctx.strokeStyle = theme.participantBoxBorder
      ctx.lineWidth = 1.5

      ctx.beginPath()
      ctx.roundRect(col.x - col.width / 2 + 10, boxY, col.width - 20, BOX_HEIGHT, BOX_RADIUS)
      ctx.fill()
      ctx.stroke()
    }

    // Label
    ctx.font = theme.headerFont
    ctx.fillStyle = theme.participantText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(col.label, col.x, headerHeight / 2 + (isActor ? 14 : 0))
  }

  // Divider line at bottom
  ctx.beginPath()
  ctx.strokeStyle = theme.headerBorder
  ctx.lineWidth = 1
  ctx.moveTo(cx - 10, headerHeight)
  ctx.lineTo(cx + viewWidth + 20, headerHeight)
  ctx.stroke()
}

function drawActorIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: Theme,
): void {
  ctx.strokeStyle = theme.participantBoxBorder
  ctx.lineWidth = 1.5

  // Head
  ctx.beginPath()
  ctx.arc(x, y - 14, 6, 0, Math.PI * 2)
  ctx.stroke()

  // Body
  ctx.beginPath()
  ctx.moveTo(x, y - 8)
  ctx.lineTo(x, y + 2)
  ctx.stroke()

  // Arms
  ctx.beginPath()
  ctx.moveTo(x - 10, y - 4)
  ctx.lineTo(x + 10, y - 4)
  ctx.stroke()

  // Legs
  ctx.beginPath()
  ctx.moveTo(x, y + 2)
  ctx.lineTo(x - 8, y + 12)
  ctx.moveTo(x, y + 2)
  ctx.lineTo(x + 8, y + 12)
  ctx.stroke()
}
