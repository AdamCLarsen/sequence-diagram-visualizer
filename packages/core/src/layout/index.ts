import type { SequenceDiagramAST } from '../parser/types'
import type { TextMeasurer, LayoutConfig, LayoutModel, ActivationLayout } from './types'
import { DEFAULT_LAYOUT_CONFIG } from './types'
import { layoutColumns } from './columns'
import { layoutRows } from './rows'
import { layoutBlocks } from './blocks'

export type { TextMeasurer, LayoutConfig, LayoutModel }
export { DEFAULT_LAYOUT_CONFIG }

export function layout(
  ast: SequenceDiagramAST,
  measurer: TextMeasurer,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): LayoutModel {
  const columns = layoutColumns(ast.participants, measurer, config)
  const rows = layoutRows(ast.messages, columns, config, ast.blocks)
  const blocks = layoutBlocks(ast.blocks, rows, columns, config)
  const activations = layoutActivations(ast, columns, rows, config)

  const totalWidth = columns.length > 0
    ? columns[columns.length - 1].x + columns[columns.length - 1].width / 2
    : 0

  const lastRow = rows[rows.length - 1]
  const totalHeight = lastRow
    ? lastRow.y + lastRow.height + 40
    : config.headerHeight + 40

  return {
    width: totalWidth,
    height: totalHeight,
    headerHeight: config.headerHeight,
    columns,
    rows,
    blocks,
    activations,
  }
}

function layoutActivations(
  ast: SequenceDiagramAST,
  columns: { participantId: string; x: number }[],
  rows: { messageIndex: number; y: number; height: number }[],
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
      startY: startRow.y + startRow.height / 2 - 8,
      endY: (endRow ? endRow.y + endRow.height / 2 : startRow.y + config.rowHeight) + 8,
      nestLevel: level,
    })
  }

  return result
}
