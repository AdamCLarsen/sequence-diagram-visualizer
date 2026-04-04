import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { layout } from '../../src/layout'
import type { TextMeasurer } from '../../src/layout/types'

const mockMeasurer: TextMeasurer = {
  measure(text: string): number {
    return text.length * 8
  },
}

describe('Layout Engine', () => {
  const ast = parse(`sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
    Bob-->>Alice: World`)

  const model = layout(ast, mockMeasurer)

  it('computes columns for each participant', () => {
    expect(model.columns).toHaveLength(2)
    expect(model.columns[0].participantId).toBe('Alice')
    expect(model.columns[1].participantId).toBe('Bob')
  })

  it('assigns column widths >= min width', () => {
    for (const col of model.columns) {
      expect(col.width).toBeGreaterThanOrEqual(120)
    }
  })

  it('positions columns left-to-right', () => {
    expect(model.columns[1].x).toBeGreaterThan(model.columns[0].x)
  })

  it('computes rows for each message', () => {
    expect(model.rows).toHaveLength(2)
    expect(model.rows[0].label.text).toBe('Hello')
    expect(model.rows[1].label.text).toBe('World')
  })

  it('positions rows below header', () => {
    expect(model.rows[0].y).toBeGreaterThanOrEqual(model.headerHeight)
  })

  it('computes total dimensions', () => {
    expect(model.width).toBeGreaterThan(0)
    expect(model.height).toBeGreaterThan(model.headerHeight)
  })

  describe('with structural blocks', () => {
    const blockAst = parse(`sequenceDiagram
    Alice->>Bob: Start
    loop Every second
        Alice->>Bob: Ping
        Bob-->>Alice: Pong
    end`)

    const blockModel = layout(blockAst, mockMeasurer)

    it('creates block layouts', () => {
      expect(blockModel.blocks.length).toBeGreaterThan(0)
      const loop = blockModel.blocks.find((b) => b.type === 'loop')
      expect(loop).toBeDefined()
      expect(loop!.width).toBeGreaterThan(0)
      expect(loop!.height).toBeGreaterThan(0)
    })
  })

  describe('with activations', () => {
    const actAst = parse(`sequenceDiagram
    Alice->>+Bob: Request
    Bob-->>-Alice: Response`)

    const actModel = layout(actAst, mockMeasurer)

    it('creates activation layouts', () => {
      expect(actModel.activations).toHaveLength(1)
      expect(actModel.activations[0].participantId).toBe('Bob')
      expect(actModel.activations[0].endY).toBeGreaterThan(actModel.activations[0].startY)
    })
  })
})
