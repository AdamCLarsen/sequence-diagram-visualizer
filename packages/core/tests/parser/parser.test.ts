import { describe, it, expect } from 'vitest'
import { parse, extractFromMarkdown } from '../../src/parser'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixture = (name: string) =>
  readFileSync(join(__dirname, '..', 'fixtures', name), 'utf-8')

describe('Parser', () => {
  describe('basic diagram', () => {
    const ast = parse(fixture('basic.mmd'))

    it('parses participants', () => {
      expect(ast.participants).toHaveLength(2)
      expect(ast.participants[0]).toEqual({ id: 'Alice', alias: 'Alice', type: 'participant' })
      expect(ast.participants[1]).toEqual({ id: 'Bob', alias: 'Bob', type: 'participant' })
    })

    it('parses messages', () => {
      expect(ast.messages).toHaveLength(2)
      expect(ast.messages[0].from).toBe('Alice')
      expect(ast.messages[0].to).toBe('Bob')
      expect(ast.messages[0].arrow).toBe('->>')
      expect(ast.messages[0].label).toBe('Hello Bob!')
      expect(ast.messages[1].arrow).toBe('-->>')
    })

    it('has no title or autonumber', () => {
      expect(ast.title).toBeUndefined()
      expect(ast.autonumber).toBe(false)
    })
  })

  describe('full features', () => {
    const ast = parse(fixture('full-features.mmd'))

    it('parses title', () => {
      expect(ast.title).toBe('Order Processing')
    })

    it('enables autonumber', () => {
      expect(ast.autonumber).toBe(true)
    })

    it('parses participant aliases', () => {
      const api = ast.participants.find((p) => p.id === 'API')
      expect(api?.alias).toBe('API Server')
    })

    it('parses actor type', () => {
      const db = ast.participants.find((p) => p.id === 'DB')
      expect(db?.type).toBe('actor')
      expect(db?.alias).toBe('Database')
    })

    it('parses all arrow types', () => {
      const arrows = ast.messages.map((m) => m.arrow)
      expect(arrows).toContain('->>')
      expect(arrows).toContain('-->>')
      expect(arrows).toContain('-)')
    })

    it('parses structural blocks', () => {
      const types = ast.blocks.map((b) => b.type)
      expect(types).toContain('alt')
      expect(types).toContain('loop')
      expect(types).toContain('opt')
      expect(types).toContain('note')
    })

    it('parses alt/else clauses', () => {
      const altBlock = ast.blocks.find((b) => b.type === 'alt')
      expect(altBlock?.elseClauses).toHaveLength(1)
      expect(altBlock?.elseClauses?.[0].label).toBe('Validation Error')
    })

    it('parses note placements', () => {
      const notes = ast.blocks.filter((b) => b.type === 'note')
      expect(notes).toHaveLength(2)

      const overNote = notes.find((n) => n.placement === 'over')
      expect(overNote?.targetParticipants).toEqual(['Client', 'API'])

      const rightNote = notes.find((n) => n.placement === 'right of')
      expect(rightNote?.targetParticipants).toEqual(['DB'])
    })

    it('parses activations', () => {
      expect(ast.activations.length).toBeGreaterThan(0)
      const apiActivation = ast.activations.find((a) => a.participantId === 'API')
      expect(apiActivation).toBeDefined()
    })
  })

  describe('implicit participants', () => {
    const ast = parse(`sequenceDiagram
    Alice->>Bob: Hello
    Bob->>Charlie: Hi`)

    it('auto-declares participants from messages', () => {
      expect(ast.participants).toHaveLength(3)
      expect(ast.participants.map((p) => p.id)).toEqual(['Alice', 'Bob', 'Charlie'])
    })
  })

  describe('activation shorthand', () => {
    const ast = parse(`sequenceDiagram
    Alice->>+Bob: Request
    Bob-->>-Alice: Response`)

    it('parses + activate shorthand', () => {
      expect(ast.messages[0].activate).toBe('+')
    })

    it('parses - deactivate shorthand', () => {
      expect(ast.messages[1].activate).toBe('-')
    })

    it('creates activation records', () => {
      expect(ast.activations).toHaveLength(1)
      expect(ast.activations[0].participantId).toBe('Bob')
    })
  })

  describe('nested blocks', () => {
    const ast = parse(`sequenceDiagram
    Alice->>Bob: Start
    loop Outer
        Alice->>Bob: Outer msg
        alt Inner condition
            Bob->>Alice: Yes
        else Otherwise
            Bob->>Alice: No
        end
    end`)

    it('parses nested blocks', () => {
      expect(ast.blocks.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('extractFromMarkdown', () => {
  it('extracts mermaid code block', () => {
    const md = fixture('markdown.md')
    const result = extractFromMarkdown(md)
    expect(result).toContain('sequenceDiagram')
    expect(result).toContain('Alice->>Bob: Hello')
  })

  it('returns null when no mermaid block found', () => {
    expect(extractFromMarkdown('# Just markdown\nNo diagrams here')).toBeNull()
  })
})
