import type { ArrowType } from '../parser/types'

export interface TextMeasurer {
  measure(text: string, font: string): number
}

export interface LayoutConfig {
  minColumnWidth: number
  rowHeight: number
  headerHeight: number
  columnPadding: number
  blockIndent: number
  activationBarWidth: number
  noteWidth: number
  font: string
  headerFont: string
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  minColumnWidth: 120,
  rowHeight: 50,
  headerHeight: 60,
  columnPadding: 40,
  blockIndent: 8,
  activationBarWidth: 10,
  noteWidth: 150,
  font: '13px sans-serif',
  headerFont: 'bold 14px sans-serif',
}

export interface ColumnLayout {
  participantId: string
  label: string
  x: number
  width: number
}

export interface RowLayout {
  messageIndex: number
  y: number
  height: number
  arrowY: number
  arrow: { fromX: number; toX: number; type: ArrowType }
  label: { text: string; midX: number; y: number }
  fromId: string
  toId: string
  fromLabel: string
  toLabel: string
}

export interface BlockLayout {
  type: string
  label: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  color?: string
}

export interface ParticipantBoxLayout {
  color: string
  label?: string
  x: number
  width: number
}

export interface ActivationLayout {
  participantId: string
  x: number
  startY: number
  endY: number
  nestLevel: number
}

export interface LayoutModel {
  width: number
  height: number
  headerHeight: number
  columns: ColumnLayout[]
  rows: RowLayout[]
  blocks: BlockLayout[]
  activations: ActivationLayout[]
  participantBoxes: ParticipantBoxLayout[]
}
