import type { StructuralBlock, Message } from '../parser/types'
import type { ColumnLayout, RowLayout, LayoutConfig, BlockLayout } from './types'

export function layoutBlocks(
  blocks: StructuralBlock[],
  rows: RowLayout[],
  columns: ColumnLayout[],
  config: LayoutConfig,
  messages?: Message[],
): BlockLayout[] {
  const result: BlockLayout[] = []

  const rowMap = new Map(rows.map((r) => [r.messageIndex, r]))
  const colMap = new Map(columns.map((c) => [c.participantId, c]))
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
    const blockPad = 30
    const y = startRow ? startRow.y - blockPad : 0
    const endY = endRow ? endRow.y + endRow.height + blockPad : y + config.rowHeight

    // Compute x/width from the participants used within this block's sequence range
    const span = getBlockSpan(block, messages, colMap, columns)
    const x = span ? span.left - indent - 20 : indent + 10
    const width = span ? span.right - span.left + indent * 2 + 40 : totalWidth - indent * 2 - 20

    result.push({
      type: block.type,
      label: block.label,
      x,
      y,
      width,
      height: endY - y,
      depth: block.depth,
      color: block.color,
    })

    // Layout else clause dividers as separate blocks
    if (block.elseClauses) {
      for (const clause of block.elseClauses) {
        const clauseRow = rowMap.get(clause.startSeq)
        if (clauseRow) {
          result.push({
            type: 'else',
            label: clause.label,
            x,
            y: clauseRow.y - blockPad,
            width,
            height: 2,
            depth: block.depth,
          })
        }
      }
    }

    // Recurse into children
    if (block.children) {
      result.push(...layoutBlocks(block.children, rows, columns, config, messages))
    }
  }

  return result
}

/** Find the leftmost and rightmost column x for participants used in a block's sequence range */
function getBlockSpan(
  block: StructuralBlock,
  messages: Message[] | undefined,
  colMap: Map<string, ColumnLayout>,
  columns: ColumnLayout[],
): { left: number; right: number } | null {
  if (!messages || columns.length === 0) return null

  // Collect all sequence indices covered by this block (including else clauses)
  const startSeq = block.startSeq
  const endSeq = block.endSeq

  let minX = Infinity
  let maxX = -Infinity

  for (const msg of messages) {
    if (msg.sequenceIndex < startSeq || msg.sequenceIndex > endSeq) continue
    const fromCol = colMap.get(msg.from)
    const toCol = colMap.get(msg.to)
    if (fromCol) {
      minX = Math.min(minX, fromCol.x)
      maxX = Math.max(maxX, fromCol.x)
    }
    if (toCol) {
      minX = Math.min(minX, toCol.x)
      maxX = Math.max(maxX, toCol.x)
    }
  }

  if (minX === Infinity) return null
  return { left: minX, right: maxX }
}

function noteHeight(label: string): number {
  const lines = label.split(/<br\s*\/?>/)
  return Math.max(30, 16 + lines.length * 16)
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
  const h = noteHeight(block.label)

  if (block.placement === 'left of') {
    x = firstTarget.x - firstTarget.width / 2 - noteW - 5
  } else if (block.placement === 'right of') {
    x = firstTarget.x + firstTarget.width / 2 + 5
  } else {
    // over
    if (block.targetParticipants.length > 1) {
      const last = colMap.get(block.targetParticipants[block.targetParticipants.length - 1])
      if (last) {
        const pad = 20
        const centerX = (firstTarget.x + last.x) / 2
        const span = Math.max(last.x - firstTarget.x + pad * 2, noteW)
        const noteY = row ? Math.max(config.headerHeight + 2, row.y - 5) : config.headerHeight + 2
        return {
          type: 'note',
          label: block.label,
          x: Math.max(5, centerX - span / 2),
          y: noteY,
          width: span,
          height: h,
          depth: 0,
        }
      }
    }
    x = Math.max(5, firstTarget.x - noteW / 2)
  }

  const noteY = row ? Math.max(config.headerHeight + 2, row.y - 5) : config.headerHeight + 2
  return {
    type: 'note',
    label: block.label,
    x,
    y: noteY,
    width: noteW,
    height: h,
    depth: 0,
  }
}
