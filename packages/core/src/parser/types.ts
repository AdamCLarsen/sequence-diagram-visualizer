/** Arrow types supported in Mermaid sequenceDiagram syntax */
export type ArrowType = '->' | '-->' | '->>' | '-->>' | '-x' | '--x' | '-)' | '--)'

export interface Participant {
  id: string
  alias: string
  type: 'participant' | 'actor'
}

export interface Message {
  from: string
  to: string
  arrow: ArrowType
  label: string
  activate?: '+' | '-'
  sequenceIndex: number
}

export interface StructuralBlock {
  type: 'loop' | 'alt' | 'opt' | 'note'
  label: string
  startSeq: number
  endSeq: number
  depth: number
  children?: StructuralBlock[]
  elseClauses?: { label: string; startSeq: number; endSeq: number }[]
  placement?: 'left of' | 'right of' | 'over'
  targetParticipants?: string[]
}

export interface Activation {
  participantId: string
  startSeq: number
  endSeq: number
}

export interface SequenceDiagramAST {
  title?: string
  autonumber: boolean
  participants: Participant[]
  messages: Message[]
  blocks: StructuralBlock[]
  activations: Activation[]
}
