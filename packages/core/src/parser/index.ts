import type {
  SequenceDiagramAST,
  Participant,
  Message,
  StructuralBlock,
  Activation,
  ArrowType,
} from './types'
import { tokenize, parseMessageToken, type Token } from './tokenizer'

export type { SequenceDiagramAST, Participant, Message, StructuralBlock, Activation, ArrowType }

/** Extract mermaid code block from markdown content */
export function extractFromMarkdown(md: string): string | null {
  const pattern = /```(?:mermaid|sequenceDiagram)\s*\n([\s\S]*?)```/
  const match = md.exec ? pattern.exec(md) : md.match(pattern)
  if (!match) return null
  return match[1].trim()
}

/** Parse Mermaid sequenceDiagram text into an AST */
export function parse(text: string): SequenceDiagramAST {
  const tokens = tokenize(text)
  const parser = new Parser(tokens)
  return parser.parse()
}

class Parser {
  private tokens: Token[]
  private pos = 0
  private participants: Map<string, Participant> = new Map()
  private participantOrder: string[] = []
  private messages: Message[] = []
  private blocks: StructuralBlock[] = []
  private activations: Activation[] = []
  private activeActivations: Map<string, number[]> = new Map()
  private title?: string
  private autonumber = false
  private sequenceIndex = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): SequenceDiagramAST {
    while (this.pos < this.tokens.length) {
      this.parseToken(this.tokens[this.pos])
      this.pos++
    }

    // Close any unclosed activations
    for (const [pid, startSeqs] of this.activeActivations) {
      for (const startSeq of startSeqs) {
        this.activations.push({
          participantId: pid,
          startSeq,
          endSeq: this.sequenceIndex - 1,
        })
      }
    }

    return {
      title: this.title,
      autonumber: this.autonumber,
      participants: this.participantOrder.map((id) => this.participants.get(id)!),
      messages: this.messages,
      blocks: this.blocks,
      activations: this.activations,
    }
  }

  private parseToken(token: Token): void {
    switch (token.type) {
      case 'sequenceDiagram':
      case 'empty':
      case 'comment':
      case 'unknown':
        break

      case 'title':
        this.title = token.value
        break

      case 'autonumber':
        this.autonumber = true
        break

      case 'participant':
        this.addParticipant(token.value, 'participant')
        break

      case 'actor':
        this.addParticipant(token.value, 'actor')
        break

      case 'message':
        this.parseMessage(token.value)
        break

      case 'activate':
        this.startActivation(token.value)
        break

      case 'deactivate':
        this.endActivation(token.value)
        break

      case 'loop':
      case 'alt':
      case 'opt':
        this.parseBlock(token.type, token.value, 0)
        break

      case 'note':
        this.parseNote(token.value)
        break

      default:
        break
    }
  }

  private addParticipant(value: string, type: 'participant' | 'actor'): void {
    // Handle "as" alias: "participant A as Alice"
    const asMatch = value.match(/^(\S+)\s+as\s+(.+)$/)
    let id: string
    let alias: string

    if (asMatch) {
      id = asMatch[1]
      alias = asMatch[2].trim()
    } else {
      id = value.trim()
      alias = id
    }

    if (!this.participants.has(id)) {
      this.participants.set(id, { id, alias, type })
      this.participantOrder.push(id)
    }
  }

  private ensureParticipant(id: string): void {
    if (!this.participants.has(id)) {
      this.participants.set(id, { id, alias: id, type: 'participant' })
      this.participantOrder.push(id)
    }
  }

  private parseMessage(value: string): void {
    const parsed = parseMessageToken(value)
    if (!parsed) return

    this.ensureParticipant(parsed.from)
    this.ensureParticipant(parsed.to)

    const msg: Message = {
      from: parsed.from,
      to: parsed.to,
      arrow: parsed.arrow as ArrowType,
      label: parsed.label,
      sequenceIndex: this.sequenceIndex,
    }

    if (parsed.activate) {
      msg.activate = parsed.activate
    }

    this.messages.push(msg)

    // Handle activation shorthand
    if (parsed.activate === '+') {
      this.startActivation(parsed.to)
    } else if (parsed.activate === '-') {
      this.endActivation(parsed.to)
    }

    this.sequenceIndex++
  }

  private startActivation(participantId: string): void {
    this.ensureParticipant(participantId)
    const stack = this.activeActivations.get(participantId) ?? []
    stack.push(this.sequenceIndex > 0 ? this.sequenceIndex - 1 : 0)
    this.activeActivations.set(participantId, stack)
  }

  private endActivation(participantId: string): void {
    const stack = this.activeActivations.get(participantId)
    if (stack && stack.length > 0) {
      const startSeq = stack.pop()!
      this.activations.push({
        participantId,
        startSeq,
        endSeq: this.sequenceIndex > 0 ? this.sequenceIndex - 1 : 0,
      })
      if (stack.length === 0) {
        this.activeActivations.delete(participantId)
      }
    }
  }

  private parseBlock(type: 'loop' | 'alt' | 'opt', label: string, depth: number): void {
    const startSeq = this.sequenceIndex
    const children: StructuralBlock[] = []
    const elseClauses: { label: string; startSeq: number; endSeq: number }[] = []
    let currentElseStart = -1
    let currentElseLabel = ''

    this.pos++

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]

      if (token.type === 'end') {
        // Close any open else clause
        if (currentElseStart >= 0) {
          elseClauses.push({
            label: currentElseLabel,
            startSeq: currentElseStart,
            endSeq: this.sequenceIndex - 1,
          })
        }

        const block: StructuralBlock = {
          type,
          label,
          startSeq,
          endSeq: this.sequenceIndex > startSeq ? this.sequenceIndex - 1 : startSeq,
          depth,
          children: children.length > 0 ? children : undefined,
          elseClauses: elseClauses.length > 0 ? elseClauses : undefined,
        }
        this.blocks.push(block)
        return
      }

      if (token.type === 'else' && type === 'alt') {
        if (currentElseStart >= 0) {
          elseClauses.push({
            label: currentElseLabel,
            startSeq: currentElseStart,
            endSeq: this.sequenceIndex - 1,
          })
        }
        currentElseStart = this.sequenceIndex
        currentElseLabel = token.value
        this.pos++
        continue
      }

      // Nested blocks
      if (token.type === 'loop' || token.type === 'alt' || token.type === 'opt') {
        if (depth < 3) {
          this.parseBlock(token.type, token.value, depth + 1)
          this.pos++
          continue
        }
      }

      if (token.type === 'note') {
        this.parseNote(token.value)
        this.pos++
        continue
      }

      this.parseToken(token)
      this.pos++
    }

    // Unclosed block — push what we have
    this.blocks.push({
      type,
      label,
      startSeq,
      endSeq: this.sequenceIndex > startSeq ? this.sequenceIndex - 1 : startSeq,
      depth,
      children: children.length > 0 ? children : undefined,
    })
  }

  private parseNote(value: string): void {
    let placement: 'left of' | 'right of' | 'over' | undefined
    let targetParticipants: string[] = []
    let label = ''

    const leftMatch = value.match(/^left of\s+(\S+)\s*:\s*(.*)$/)
    const rightMatch = value.match(/^right of\s+(\S+)\s*:\s*(.*)$/)
    const overMatch = value.match(/^over\s+(.+?)\s*:\s*(.*)$/)

    if (leftMatch) {
      placement = 'left of'
      targetParticipants = [leftMatch[1].trim()]
      label = leftMatch[2].trim()
    } else if (rightMatch) {
      placement = 'right of'
      targetParticipants = [rightMatch[1].trim()]
      label = rightMatch[2].trim()
    } else if (overMatch) {
      placement = 'over'
      targetParticipants = overMatch[1].split(',').map((p) => p.trim())
      label = overMatch[2].trim()
    }

    for (const p of targetParticipants) {
      this.ensureParticipant(p)
    }

    const block: StructuralBlock = {
      type: 'note',
      label,
      startSeq: this.sequenceIndex,
      endSeq: this.sequenceIndex,
      depth: 0,
      placement,
      targetParticipants,
    }
    this.blocks.push(block)
    this.sequenceIndex++
  }
}
