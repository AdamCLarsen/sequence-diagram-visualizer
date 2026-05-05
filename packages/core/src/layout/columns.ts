import type { Participant } from '../parser/types'
import type { TextMeasurer, LayoutConfig, ColumnLayout } from './types'

const BR_RE = /<br\s*\/?>/i

export function layoutColumns(
  participants: Participant[],
  measurer: TextMeasurer,
  config: LayoutConfig,
): ColumnLayout[] {
  const columns: ColumnLayout[] = []
  let x = 0

  for (const p of participants) {
    const labelLines = p.alias.split(BR_RE).map((s) => s.trim())
    const labelWidth = labelLines.reduce(
      (max, line) => Math.max(max, measurer.measure(line, config.headerFont)),
      0,
    )
    const width = Math.max(config.minColumnWidth, labelWidth + config.columnPadding * 2)

    columns.push({
      participantId: p.id,
      label: labelLines.join(' '),
      labelLines,
      x: x + width / 2,
      width,
    })

    x += width
  }

  return columns
}
