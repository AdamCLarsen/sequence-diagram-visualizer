import type { Message, StructuralBlock } from '../parser/types'
import type { ColumnLayout, LayoutConfig, RowLayout } from './types'

const BLOCK_TAG_HEIGHT = 30

export function layoutRows(
  messages: Message[],
  columns: ColumnLayout[],
  config: LayoutConfig,
  blocks?: StructuralBlock[],
): RowLayout[] {
  const colMap = new Map(columns.map((c) => [c.participantId, c]))
  const rows: RowLayout[] = []
  let y = config.headerHeight

  // Collect note sequence indices and block boundary info
  const noteSeqs = new Set<number>()
  const blockStartSeqs = new Set<number>()
  const blockEndSeqs = new Set<number>()
  if (blocks) {
    for (const b of blocks) {
      if (b.type === 'note') {
        noteSeqs.add(b.startSeq)
      } else {
        blockStartSeqs.add(b.startSeq)
        blockEndSeqs.add(b.endSeq)
        if (b.elseClauses) {
          for (const c of b.elseClauses) blockStartSeqs.add(c.startSeq)
        }
      }
    }
  }

  // Build sorted list of all sequence indices that need rows
  const msgMap = new Map(messages.map((m) => [m.sequenceIndex, m]))
  const allSeqs = new Set([...messages.map((m) => m.sequenceIndex), ...noteSeqs])
  const sorted = [...allSeqs].sort((a, b) => a - b)

  let prevSeq = -1
  for (const seq of sorted) {
    const msg = msgMap.get(seq)
    const height = config.rowHeight

    // Add top padding when this row starts a block (space for the block tag)
    if (blockStartSeqs.has(seq)) {
      y += BLOCK_TAG_HEIGHT
    }
    // Add gap after a block end before the next row
    if (prevSeq >= 0 && blockEndSeqs.has(prevSeq)) {
      y += 10
    }

    if (msg) {
      const fromCol = colMap.get(msg.from)
      const toCol = colMap.get(msg.to)
      if (!fromCol || !toCol) continue

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
    } else {
      // Spacer row for notes and other non-message items
      rows.push({
        messageIndex: seq,
        y,
        height,
        arrow: { fromX: 0, toX: 0, type: '->>' },
        label: { text: '', midX: 0, y: 0 },
      })
    }

    y += height
    prevSeq = seq
  }

  return rows
}
