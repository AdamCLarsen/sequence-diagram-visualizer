import type { Participant } from '../parser/types'
import type { TextMeasurer, LayoutConfig, ColumnLayout } from './types'

export function layoutColumns(
  participants: Participant[],
  measurer: TextMeasurer,
  config: LayoutConfig,
): ColumnLayout[] {
  const columns: ColumnLayout[] = []
  let x = 0

  for (const p of participants) {
    const labelWidth = measurer.measure(p.alias, config.headerFont)
    const width = Math.max(config.minColumnWidth, labelWidth + config.columnPadding * 2)

    columns.push({
      participantId: p.id,
      label: p.alias,
      x: x + width / 2,
      width,
    })

    x += width
  }

  return columns
}
