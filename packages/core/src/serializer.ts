import type {
  SequenceDiagramAST,
  Participant,
  ParticipantBox,
  Message,
  StructuralBlock,
  Activation,
} from './parser/types'

const INDENT = '    '

/** Serialize a parsed AST back to canonical Mermaid sequenceDiagram text.
 *  Only includes elements that affect rendering — comments, whitespace,
 *  and unknown directives are stripped. */
export function serialize(ast: SequenceDiagramAST): string {
  const lines: string[] = ['sequenceDiagram']

  if (ast.title) {
    lines.push(INDENT + `title ${ast.title}`)
  }
  if (ast.autonumber) {
    lines.push(INDENT + 'autonumber')
  }

  // --- Participant declarations (preserve original order) ---
  // Map each participant to the box it belongs to (if any)
  const pidToBox = new Map<string, ParticipantBox>()
  for (const box of ast.participantBoxes) {
    for (const pid of box.participantIds) {
      pidToBox.set(pid, box)
    }
  }

  // Walk participants in declaration order; when we hit the first member of a
  // box, emit the entire box, then continue with non-boxed participants.
  const emittedBoxes = new Set<ParticipantBox>()
  if (ast.participants.length > 0) {
    lines.push('')
    for (const p of ast.participants) {
      const box = pidToBox.get(p.id)
      if (box) {
        if (!emittedBoxes.has(box)) {
          emittedBoxes.add(box)
          lines.push(INDENT + formatBox(box))
          for (const pid of box.participantIds) {
            const bp = ast.participants.find((pp) => pp.id === pid)
            if (bp) lines.push(INDENT + INDENT + formatParticipant(bp))
          }
          lines.push(INDENT + 'end')
        }
      } else {
        lines.push(INDENT + formatParticipant(p))
      }
    }
  }

  // --- Body: messages, notes, blocks, activations ---
  const msgMap = new Map<number, Message>()
  for (const msg of ast.messages) {
    msgMap.set(msg.sequenceIndex, msg)
  }

  const noteMap = new Map<number, StructuralBlock>()
  const structBlocks: StructuralBlock[] = []
  for (const block of ast.blocks) {
    if (block.type === 'note') {
      noteMap.set(block.startSeq, block)
    } else {
      structBlocks.push(block)
    }
  }

  const { standaloneActivates, standaloneDeactivates } =
    findStandaloneActivations(ast.messages, ast.activations)

  let maxSeq = -1
  for (const msg of ast.messages) {
    if (msg.sequenceIndex > maxSeq) maxSeq = msg.sequenceIndex
  }
  for (const block of ast.blocks) {
    if (block.endSeq > maxSeq) maxSeq = block.endSeq
  }

  if (maxSeq >= 0) {
    lines.push('')
    emitBodyRange(
      lines, 0, maxSeq, 0,
      structBlocks, msgMap, noteMap,
      standaloneActivates, standaloneDeactivates,
      1,
    )
  }

  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatParticipant(p: Participant): string {
  const kw = p.type === 'actor' ? 'actor' : 'participant'
  return p.id !== p.alias ? `${kw} ${p.id} as ${p.alias}` : `${kw} ${p.id}`
}

function formatBox(box: ParticipantBox): string {
  let line = 'box'
  if (box.color) line += ' ' + box.color
  if (box.label) line += ' ' + box.label
  return line
}

function formatMessage(msg: Message): string {
  let target = msg.to
  if (msg.activate) target = msg.activate + target
  return msg.label
    ? `${msg.from}${msg.arrow}${target}: ${msg.label}`
    : `${msg.from}${msg.arrow}${target}`
}

function formatNote(block: StructuralBlock): string {
  const targets = block.targetParticipants?.join(',') ?? ''
  return `note ${block.placement} ${targets}: ${block.label}`
}

// ---------------------------------------------------------------------------
// Activation analysis — separate shorthand (+/-) from standalone statements
// ---------------------------------------------------------------------------

function findStandaloneActivations(
  messages: Message[],
  activations: Activation[],
): {
  standaloneActivates: Map<number, string[]>
  standaloneDeactivates: Map<number, string[]>
} {
  const msgStarts = new Set<string>()
  const msgEnds = new Set<string>()

  for (const msg of messages) {
    if (msg.activate === '+') {
      const seq = msg.sequenceIndex > 0 ? msg.sequenceIndex - 1 : 0
      msgStarts.add(`${msg.to}:${seq}`)
    } else if (msg.activate === '-') {
      const seq = msg.sequenceIndex > 0 ? msg.sequenceIndex - 1 : 0
      msgEnds.add(`${msg.to}:${seq}`)
    }
  }

  const standaloneActivates = new Map<number, string[]>()
  const standaloneDeactivates = new Map<number, string[]>()

  for (const act of activations) {
    if (!msgStarts.has(`${act.participantId}:${act.startSeq}`)) {
      const list = standaloneActivates.get(act.startSeq) ?? []
      list.push(act.participantId)
      standaloneActivates.set(act.startSeq, list)
    }
    if (!msgEnds.has(`${act.participantId}:${act.endSeq}`)) {
      const list = standaloneDeactivates.get(act.endSeq) ?? []
      list.push(act.participantId)
      standaloneDeactivates.set(act.endSeq, list)
    }
  }

  return { standaloneActivates, standaloneDeactivates }
}

// ---------------------------------------------------------------------------
// Recursive body emitter — interleaves messages, notes, blocks, activations
// ---------------------------------------------------------------------------

function emitBodyRange(
  lines: string[],
  fromSeq: number,
  toSeq: number,
  depth: number,
  blocks: StructuralBlock[],
  msgMap: Map<number, Message>,
  noteMap: Map<number, StructuralBlock>,
  standaloneActivates: Map<number, string[]>,
  standaloneDeactivates: Map<number, string[]>,
  indentLevel: number,
): void {
  const pad = INDENT.repeat(indentLevel)
  let seq = fromSeq

  while (seq <= toSeq) {
    // Structural block opening at this seq & depth?
    const block = blocks.find((b) => b.startSeq === seq && b.depth === depth)
    if (block) {
      // Open the block
      if (block.type === 'rect') {
        lines.push(pad + `rect ${block.color ?? ''}`.trimEnd())
      } else {
        lines.push(pad + `${block.type} ${block.label}`.trimEnd())
      }

      const inner = indentLevel + 1

      if (block.elseClauses && block.elseClauses.length > 0) {
        // Main body: startSeq → first else's startSeq − 1
        const firstElse = block.elseClauses[0].startSeq
        emitBodyRange(lines, block.startSeq, firstElse - 1, depth + 1, blocks, msgMap, noteMap, standaloneActivates, standaloneDeactivates, inner)

        for (const clause of block.elseClauses) {
          const kw =
            block.type === 'alt' ? 'else'
            : block.type === 'critical' ? 'option'
            : 'and'
          lines.push(pad + `${kw} ${clause.label}`.trimEnd())
          emitBodyRange(lines, clause.startSeq, clause.endSeq, depth + 1, blocks, msgMap, noteMap, standaloneActivates, standaloneDeactivates, inner)
        }
      } else {
        emitBodyRange(lines, block.startSeq, block.endSeq, depth + 1, blocks, msgMap, noteMap, standaloneActivates, standaloneDeactivates, inner)
      }

      lines.push(pad + 'end')
      seq = block.endSeq + 1
      continue
    }

    // Note at this seq?
    const note = noteMap.get(seq)
    if (note) {
      lines.push(pad + formatNote(note))
      seq++
      continue
    }

    // Message at this seq?
    const msg = msgMap.get(seq)
    if (msg) {
      lines.push(pad + formatMessage(msg))

      // Standalone activate / deactivate after this message
      for (const pid of standaloneActivates.get(seq) ?? []) {
        lines.push(pad + `activate ${pid}`)
      }
      for (const pid of standaloneDeactivates.get(seq) ?? []) {
        lines.push(pad + `deactivate ${pid}`)
      }

      seq++
      continue
    }

    seq++
  }
}
