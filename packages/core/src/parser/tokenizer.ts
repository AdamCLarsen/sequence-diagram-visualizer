export type TokenType =
  | 'sequenceDiagram'
  | 'title'
  | 'autonumber'
  | 'participant'
  | 'actor'
  | 'message'
  | 'activate'
  | 'deactivate'
  | 'loop'
  | 'alt'
  | 'else'
  | 'opt'
  | 'note'
  | 'end'
  | 'comment'
  | 'empty'
  | 'unknown'

export interface Token {
  type: TokenType
  raw: string
  value: string
  line: number
}

const ARROW_PATTERN = /^(.+?)\s*(-->>|--\)|-->|--x|->>|-\)|->|-x)\s*(.+?)$/

export function tokenize(text: string): Token[] {
  const lines = text.split('\n')
  const tokens: Token[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    const lineNum = i + 1

    if (!trimmed || trimmed === '') {
      tokens.push({ type: 'empty', raw, value: '', line: lineNum })
      continue
    }

    if (trimmed.startsWith('%%')) {
      tokens.push({ type: 'comment', raw, value: trimmed.slice(2).trim(), line: lineNum })
      continue
    }

    if (trimmed === 'sequenceDiagram') {
      tokens.push({ type: 'sequenceDiagram', raw, value: '', line: lineNum })
      continue
    }

    if (trimmed.startsWith('title')) {
      const value = trimmed.replace(/^title\s*:?\s*/, '')
      tokens.push({ type: 'title', raw, value, line: lineNum })
      continue
    }

    if (trimmed === 'autonumber') {
      tokens.push({ type: 'autonumber', raw, value: '', line: lineNum })
      continue
    }

    if (trimmed.startsWith('participant ') || trimmed.startsWith('participant\t')) {
      const value = trimmed.slice('participant '.length).trim()
      tokens.push({ type: 'participant', raw, value, line: lineNum })
      continue
    }

    if (trimmed.startsWith('actor ') || trimmed.startsWith('actor\t')) {
      const value = trimmed.slice('actor '.length).trim()
      tokens.push({ type: 'actor', raw, value, line: lineNum })
      continue
    }

    if (trimmed.startsWith('activate ')) {
      tokens.push({ type: 'activate', raw, value: trimmed.slice('activate '.length).trim(), line: lineNum })
      continue
    }

    if (trimmed.startsWith('deactivate ')) {
      tokens.push({ type: 'deactivate', raw, value: trimmed.slice('deactivate '.length).trim(), line: lineNum })
      continue
    }

    if (trimmed.startsWith('loop ')) {
      tokens.push({ type: 'loop', raw, value: trimmed.slice('loop '.length).trim(), line: lineNum })
      continue
    }

    if (trimmed.startsWith('alt ')) {
      tokens.push({ type: 'alt', raw, value: trimmed.slice('alt '.length).trim(), line: lineNum })
      continue
    }

    if (trimmed.startsWith('else')) {
      const value = trimmed.slice('else'.length).trim()
      tokens.push({ type: 'else', raw, value, line: lineNum })
      continue
    }

    if (trimmed.startsWith('opt ')) {
      tokens.push({ type: 'opt', raw, value: trimmed.slice('opt '.length).trim(), line: lineNum })
      continue
    }

    if (trimmed.startsWith('note ')) {
      tokens.push({ type: 'note', raw, value: trimmed.slice('note '.length).trim(), line: lineNum })
      continue
    }

    if (trimmed === 'end') {
      tokens.push({ type: 'end', raw, value: '', line: lineNum })
      continue
    }

    // Try to match message pattern: From ArrowType To : Label
    const msgMatch = trimmed.match(ARROW_PATTERN)
    if (msgMatch) {
      tokens.push({ type: 'message', raw, value: trimmed, line: lineNum })
      continue
    }

    tokens.push({ type: 'unknown', raw, value: trimmed, line: lineNum })
  }

  return tokens
}

/** Parse a message token value into components */
export function parseMessageToken(value: string): {
  from: string
  to: string
  arrow: string
  label: string
  activate?: '+' | '-'
} | null {
  // Pattern: from arrow to : label
  // The arrow can be: -->> | --) | --> | --x | ->> | -) | -> | -x
  const match = value.match(/^(.+?)\s*(-->>|--\)|-->|--x|->>|-\)|->|-x)\s*(.+?)$/)
  if (!match) return null

  const from = match[1].trim()
  const arrow = match[2]
  let rest = match[3].trim()

  // Split on colon to get target and label
  const colonIdx = rest.indexOf(':')
  let to: string
  let label: string

  if (colonIdx !== -1) {
    to = rest.slice(0, colonIdx).trim()
    label = rest.slice(colonIdx + 1).trim()
  } else {
    to = rest
    label = ''
  }

  // Check for activation shorthand (+/-)
  // Can be prefix (+Bob) or suffix (Bob+)
  let activate: '+' | '-' | undefined
  if (to.startsWith('+')) {
    activate = '+'
    to = to.slice(1).trim()
  } else if (to.startsWith('-')) {
    activate = '-'
    to = to.slice(1).trim()
  } else if (to.endsWith('+')) {
    activate = '+'
    to = to.slice(0, -1).trim()
  } else if (to.endsWith('-')) {
    activate = '-'
    to = to.slice(0, -1).trim()
  }

  return { from, to, arrow, label, activate }
}
