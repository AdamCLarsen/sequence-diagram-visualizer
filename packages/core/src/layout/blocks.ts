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

  // First pass: compute each block's layout independently. Structural blocks
  // keep a back-reference to their source so we can expand outer blocks to
  // contain inner ones in a second pass.
  interface Entry { layout: BlockLayout; block: StructuralBlock; elseLayouts: BlockLayout[] }
  const entries: Entry[] = []

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

    const span = getBlockSpan(block, messages, colMap, columns)
    const x = span ? span.left - indent - 20 : indent + 10
    const width = span ? span.right - span.left + indent * 2 + 40 : totalWidth - indent * 2 - 20

    const layout: BlockLayout = {
      type: block.type,
      label: block.label,
      x,
      y,
      width,
      height: endY - y,
      depth: block.depth,
      color: block.color,
    }
    const elseLayouts: BlockLayout[] = []
    if (block.elseClauses) {
      for (const clause of block.elseClauses) {
        const clauseRow = rowMap.get(clause.startSeq)
        if (clauseRow) {
          elseLayouts.push({
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
    entries.push({ layout, block, elseLayouts })
  }

  // Second pass: for every (outer, inner) pair where outer's sequence range
  // fully contains inner's, expand outer's bounds to hold inner. Sorting
  // inner-first ensures an inner block's already-expanded size is visible to
  // the next outer that contains it (handles 3+ levels of nesting).
  const containPad = 10
  const bySpan = [...entries].sort(
    (a, b) => (a.block.endSeq - a.block.startSeq) - (b.block.endSeq - b.block.startSeq),
  )
  for (const inner of bySpan) {
    for (const outer of entries) {
      if (outer === inner) continue
      if (!fullyContains(outer.block, inner.block)) continue
      expandToContain(outer.layout, inner.layout, containPad)
    }
  }

  // Propagate the outer block's expanded x/width to its own else dividers.
  for (const entry of entries) {
    result.push(entry.layout)
    for (const elseLayout of entry.elseLayouts) {
      elseLayout.x = entry.layout.x
      elseLayout.width = entry.layout.width
      result.push(elseLayout)
    }
  }

  return result
}

function fullyContains(outer: StructuralBlock, inner: StructuralBlock): boolean {
  if (outer.startSeq > inner.startSeq || outer.endSeq < inner.endSeq) return false
  // Equal ranges aren't containment — one has to strictly enclose the other.
  return outer.startSeq < inner.startSeq || outer.endSeq > inner.endSeq
}

function expandToContain(outer: BlockLayout, inner: BlockLayout, pad: number): void {
  const right = Math.max(outer.x + outer.width, inner.x + inner.width + pad)
  const bottom = Math.max(outer.y + outer.height, inner.y + inner.height + pad)
  const left = Math.min(outer.x, inner.x - pad)
  const top = Math.min(outer.y, inner.y - pad)
  outer.x = left
  outer.y = top
  outer.width = right - left
  outer.height = bottom - top
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
