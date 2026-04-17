import type { Message, StructuralBlock } from '../parser/types'
import type { ColumnLayout, LayoutConfig, RowLayout } from './types'

const BLOCK_TAG_HEIGHT = 40
const LABEL_LINE_HEIGHT = 16

export function splitLabelLines(label: string): string[] {
  return label.split(/<br\s*\/?>/i).map((s) => s.trim())
}

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
    // Compact rows for messages with no label text; note spacers keep full height
    const isNoteSpacerRow = !msg && noteSeqs.has(seq)
    const labelLines = msg ? splitLabelLines(msg.label) : []
    const hasLabel = labelLines.some((l) => l.length > 0)
    const extraHeight = hasLabel ? (labelLines.length - 1) * LABEL_LINE_HEIGHT : 0
    const height = (hasLabel || isNoteSpacerRow)
      ? config.rowHeight + extraHeight
      : Math.round(config.rowHeight * 0.55)

    // Add top padding when this row starts a block (space for the block tag)
    if (blockStartSeqs.has(seq)) {
      y += BLOCK_TAG_HEIGHT
    }
    // Add gap after a block end before the next row
    if (prevSeq >= 0 && blockEndSeqs.has(prevSeq)) {
      y += 30
    }

    if (msg) {
      const fromCol = colMap.get(msg.from)
      const toCol = colMap.get(msg.to)
      if (!fromCol || !toCol) continue

      // Keep the arrow at a consistent offset from the row bottom so that
      // multi-line labels can stack above it without shifting the arrow
      // line into neighbouring rows. For compact (label-less) rows fall back
      // to the center.
      const arrowY = hasLabel
        ? y + height - config.rowHeight / 2
        : y + height / 2
      const fromX = fromCol.x
      const toX = toCol.x
      const midX = (fromX + toX) / 2

      rows.push({
        messageIndex: msg.sequenceIndex,
        y,
        height,
        arrowY,
        arrow: {
          fromX,
          toX,
          type: msg.arrow,
        },
        label: {
          text: msg.label,
          midX,
          y: arrowY - 8,
        },
        fromId: msg.from,
        toId: msg.to,
        fromLabel: fromCol.label,
        toLabel: toCol.label,
      })
    } else {
      // Spacer row for notes and other non-message items
      rows.push({
        messageIndex: seq,
        y,
        height,
        arrowY: y + height / 2,
        arrow: { fromX: 0, toX: 0, type: '->>' },
        label: { text: '', midX: 0, y: 0 },
        fromId: '',
        toId: '',
        fromLabel: '',
        toLabel: '',
      })
    }

    y += height
    prevSeq = seq
  }

  return rows
}
