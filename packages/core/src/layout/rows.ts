import type { Message } from '../parser/types'
import type { ColumnLayout, LayoutConfig, RowLayout } from './types'

export function layoutRows(
  messages: Message[],
  columns: ColumnLayout[],
  config: LayoutConfig,
): RowLayout[] {
  const colMap = new Map(columns.map((c) => [c.participantId, c]))
  const rows: RowLayout[] = []
  let y = config.headerHeight

  for (const msg of messages) {
    const fromCol = colMap.get(msg.from)
    const toCol = colMap.get(msg.to)
    if (!fromCol || !toCol) continue

    const height = config.rowHeight
    const rowY = y + height / 2

    const fromX = fromCol.x
    const toX = toCol.x
    const midX = (fromX + toX) / 2

    rows.push({
      messageIndex: msg.sequenceIndex,
      y,
      height,
      arrow: {
        fromX,
        toX,
        type: msg.arrow,
      },
      label: {
        text: msg.label,
        midX,
        y: rowY - 8,
      },
    })

    y += height
  }

  return rows
}
