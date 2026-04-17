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

  describe('with nested structural blocks', () => {
    // Contrived: inner alt touches a participant (Catalog) that the outer
    // loop's direct messages don't, so without containment expansion the
    // alt's right edge pokes past the loop's right edge.
    const nestedAst = parse(`sequenceDiagram
    participant Factory
    participant Cache
    participant Catalog
    loop for each part
      Factory->>Cache: lookup
      alt cached
        Cache-->>Factory: supplier
      else not cached
        Factory->>Catalog: fetch
        Catalog-->>Factory: supplier
        Factory->>Cache: store
      end
    end`)

    const nestedModel = layout(nestedAst, mockMeasurer)
    const loop = nestedModel.blocks.find((b) => b.type === 'loop')!
    const alt = nestedModel.blocks.find((b) => b.type === 'alt')!

    const contains = (outer: typeof loop, inner: typeof alt): boolean =>
      outer.x <= inner.x &&
      outer.y <= inner.y &&
      outer.x + outer.width >= inner.x + inner.width &&
      outer.y + outer.height >= inner.y + inner.height

    it('expands outer block to fully contain nested inner block', () => {
      expect(contains(loop, alt)).toBe(true)
    })

    it('leaves padding between outer and inner block edges', () => {
      expect(alt.x - loop.x).toBeGreaterThanOrEqual(10)
      expect(loop.x + loop.width - (alt.x + alt.width)).toBeGreaterThanOrEqual(10)
    })

    it('expands else-clause dividers to match the expanded parent width', () => {
      const elseDiv = nestedModel.blocks.find((b) => b.type === 'else')
      expect(elseDiv).toBeDefined()
      expect(elseDiv!.x).toBe(alt.x)
      expect(elseDiv!.width).toBe(alt.width)
    })
  })

  describe('with three levels of nesting', () => {
    const deepAst = parse(`sequenceDiagram
    participant A
    participant B
    participant C
    participant D
    loop outer
      A->>B: start
      opt middle
        B->>C: step
        alt inner
          C->>D: deepest reach
        end
      end
    end`)

    const deepModel = layout(deepAst, mockMeasurer)
    const loop = deepModel.blocks.find((b) => b.type === 'loop')!
    const opt = deepModel.blocks.find((b) => b.type === 'opt')!
    const alt = deepModel.blocks.find((b) => b.type === 'alt')!

    const contains = (o: typeof loop, i: typeof alt): boolean =>
      o.x <= i.x &&
      o.y <= i.y &&
      o.x + o.width >= i.x + i.width &&
      o.y + o.height >= i.y + i.height

    it('outermost block contains deepest inner block transitively', () => {
      expect(contains(opt, alt)).toBe(true)
      expect(contains(loop, opt)).toBe(true)
      expect(contains(loop, alt)).toBe(true)
    })
  })

  describe('with multi-line message labels', () => {
    const singleAst = parse(`sequenceDiagram
    Alice->>Bob: hello world`)
    const multiAst = parse(`sequenceDiagram
    Alice->>Bob: hello<br/>world<br/>!`)

    const singleModel = layout(singleAst, mockMeasurer)
    const multiModel = layout(multiAst, mockMeasurer)

    it('grows row height for each <br/> in the label', () => {
      const single = singleModel.rows[0]
      const multi = multiModel.rows[0]
      expect(multi.height).toBeGreaterThan(single.height)
      // Two <br/>s = two extra 16px lines
      expect(multi.height - single.height).toBe(32)
    })

    it('keeps the arrow line anchored near the row bottom so labels stack above', () => {
      const multi = multiModel.rows[0]
      expect(multi.arrowY).toBeGreaterThan(multi.y)
      expect(multi.arrowY).toBeLessThanOrEqual(multi.y + multi.height)
      // Label baseline sits just above the arrow
      expect(multi.label.y).toBeLessThan(multi.arrowY)
    })

    it('does not add extra height when the label has no <br/>', () => {
      const single = singleModel.rows[0]
      expect(single.arrowY).toBe(single.y + single.height / 2)
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
