import type { StructuralBlock } from '../parser/types'
import type { ColumnLayout, RowLayout, LayoutConfig, BlockLayout } from './types'

export function layoutBlocks(
  blocks: StructuralBlock[],
  rows: RowLayout[],
  columns: ColumnLayout[],
  config: LayoutConfig,
): BlockLayout[] {
  const result: BlockLayout[] = []

  const rowMap = new Map(rows.map((r) => [r.messageIndex, r]))
  const totalWidth = columns.length > 0
    ? columns[columns.length - 1].x + columns[columns.length - 1].width / 2
    : 0

  for (const block of blocks) {
    if (block.type === 'note') {
      const layout = layoutNote(block, columns, rowMap, config)
      if (layout) result.push(layout)
      continue
    }

    const startRow = rowMap.get(block.startSeq)
    const endRow = rowMap.get(block.endSeq)
    if (!startRow && !endRow) continue

    const indent = block.depth * config.blockIndent
    const y = startRow ? startRow.y - 10 : 0
    const endY = endRow ? endRow.y + endRow.height + 5 : y + config.rowHeight

    result.push({
      type: block.type,
      label: block.label,
      x: indent + 10,
      y,
      width: totalWidth - indent * 2 - 20,
      height: endY - y,
      depth: block.depth,
    })

    // Layout else clause dividers as separate blocks
    if (block.elseClauses) {
      for (const clause of block.elseClauses) {
        const clauseRow = rowMap.get(clause.startSeq)
        if (clauseRow) {
          result.push({
            type: 'else',
            label: clause.label,
            x: indent + 10,
            y: clauseRow.y - 10,
            width: totalWidth - indent * 2 - 20,
            height: 2,
            depth: block.depth,
          })
        }
      }
    }

    // Recurse into children
    if (block.children) {
      result.push(...layoutBlocks(block.children, rows, columns, config))
    }
  }

  return result
}

function layoutNote(
  block: StructuralBlock,
  columns: ColumnLayout[],
  rowMap: Map<number, RowLayout>,
  config: LayoutConfig,
): BlockLayout | null {
  const row = rowMap.get(block.startSeq)
  const colMap = new Map(columns.map((c) => [c.participantId, c]))

  if (!block.targetParticipants?.length) return null

  const firstTarget = colMap.get(block.targetParticipants[0])
  if (!firstTarget) return null

  let x: number
  const noteW = config.noteWidth

  if (block.placement === 'left of') {
    x = firstTarget.x - firstTarget.width / 2 - noteW - 5
  } else if (block.placement === 'right of') {
    x = firstTarget.x + firstTarget.width / 2 + 5
  } else {
    // over
    if (block.targetParticipants.length > 1) {
      const last = colMap.get(block.targetParticipants[block.targetParticipants.length - 1])
      if (last) {
        x = firstTarget.x - noteW / 2
        const span = last.x - firstTarget.x + noteW
        return {
          type: 'note',
          label: block.label,
          x: firstTarget.x - span / 2 + (last.x - firstTarget.x) / 2,
          y: row ? row.y - 5 : 0,
          width: span,
          height: 30,
          depth: 0,
        }
      }
    }
    x = firstTarget.x - noteW / 2
  }

  return {
    type: 'note',
    label: block.label,
    x,
    y: row ? row.y - 5 : 0,
    width: noteW,
    height: 30,
    depth: 0,
  }
}
