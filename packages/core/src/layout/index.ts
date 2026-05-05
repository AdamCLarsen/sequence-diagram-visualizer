import type { SequenceDiagramAST } from '../parser/types'
import type { TextMeasurer, LayoutConfig, LayoutModel, ActivationLayout, ParticipantBoxLayout } from './types'
import { DEFAULT_LAYOUT_CONFIG } from './types'
import { layoutColumns } from './columns'
import { layoutRows } from './rows'
import { layoutBlocks } from './blocks'

export type { TextMeasurer, LayoutConfig, LayoutModel }
export { DEFAULT_LAYOUT_CONFIG }

const HEADER_LINE_HEIGHT = 16

export function layout(
  ast: SequenceDiagramAST,
  measurer: TextMeasurer,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): LayoutModel {
  const columns = layoutColumns(ast.participants, measurer, config)

  const headerLineCount = columns.reduce(
    (max, col) => Math.max(max, col.labelLines.length),
    1,
  )
  const headerExtra = (headerLineCount - 1) * HEADER_LINE_HEIGHT
  const effectiveConfig: LayoutConfig =
    headerExtra > 0
      ? { ...config, headerHeight: config.headerHeight + headerExtra }
      : config

  const rows = layoutRows(ast.messages, columns, effectiveConfig, ast.blocks)
  const blocks = layoutBlocks(ast.blocks, rows, columns, effectiveConfig, ast.messages)
  const activations = layoutActivations(ast, columns, rows, effectiveConfig)
  const participantBoxes = layoutParticipantBoxes(ast, columns)

  const totalWidth = columns.length > 0
    ? columns[columns.length - 1].x + columns[columns.length - 1].width / 2
    : 0

  const lastRow = rows[rows.length - 1]
  const totalHeight = lastRow
    ? lastRow.y + lastRow.height + 40
    : effectiveConfig.headerHeight + 40

  return {
    width: totalWidth,
    height: totalHeight,
    headerHeight: effectiveConfig.headerHeight,
    columns,
    rows,
    blocks,
    activations,
    participantBoxes,
  }
}

function layoutActivations(
  ast: SequenceDiagramAST,
  columns: { participantId: string; x: number }[],
  rows: { messageIndex: number; y: number; height: number; arrowY: number }[],
  config: LayoutConfig,
): ActivationLayout[] {
  const colMap = new Map(columns.map((c) => [c.participantId, c]))
  const rowMap = new Map(rows.map((r) => [r.messageIndex, r]))
  const result: ActivationLayout[] = []

  // Track nesting per participant
  const nestCount = new Map<string, number>()

  for (const act of ast.activations) {
    const col = colMap.get(act.participantId)
    if (!col) continue

    const startRow = rowMap.get(act.startSeq)
    const endRow = rowMap.get(act.endSeq)
    if (!startRow) continue

    const level = nestCount.get(act.participantId) ?? 0
    nestCount.set(act.participantId, level + 1)

    result.push({
      participantId: act.participantId,
      x: col.x - config.activationBarWidth / 2 + level * 4,
      startY: startRow.arrowY - 8,
      endY: (endRow ? endRow.arrowY : startRow.y + config.rowHeight) + 8,
      nestLevel: level,
    })
  }

  return result
}

function layoutParticipantBoxes(
  ast: SequenceDiagramAST,
  columns: { participantId: string; x: number; width: number }[],
): ParticipantBoxLayout[] {
  const colMap = new Map(columns.map((c) => [c.participantId, c]))
  const result: ParticipantBoxLayout[] = []

  for (const box of ast.participantBoxes) {
    const cols = box.participantIds.map((id) => colMap.get(id)).filter(Boolean) as typeof columns
    if (cols.length === 0) continue

    const leftCol = cols[0]
    const rightCol = cols[cols.length - 1]
    const x = leftCol.x - leftCol.width / 2
    const rightEdge = rightCol.x + rightCol.width / 2
    const width = rightEdge - x

    result.push({
      color: box.color,
      label: box.label,
      x,
      width,
    })
  }

  return result
}
