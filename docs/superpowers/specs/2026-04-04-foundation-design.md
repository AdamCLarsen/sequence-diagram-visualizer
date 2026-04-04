# Sequence Diagram Visualizer: Foundation Design Spec

**Date:** 2026-04-04
**Status:** Approved
**Supersedes:** Rendering architecture decisions in `docs/mermaid-visualizer-prd.md` Section 3.1 and 7.3

---

## 1. Summary

A web-based, read-only interactive viewer for Mermaid `sequenceDiagram` syntax. Renders diagrams as Canvas 2D draw calls with a purpose-built visual language. Sticky participant headers, persistent message labels, synchronized scroll/pan, zoom, and single-button file reload are v1 MVP features.

Mermaid is the syntax compatibility target, not a dependency.

---

## 2. Architecture

### 2.1 Two-Package Structure

The project is split into a portable core library and a thin web shell:

**`@seq-viz/core`** (zero dependencies):
- Parser: Mermaid `sequenceDiagram` text → AST
- Layout Engine: AST → LayoutModel (positions, dimensions, relationships)
- Canvas Renderer: LayoutModel → Canvas 2D draw calls
- Viewport Controller: virtual camera, zoom, pan, scroll, input handling

**`@seq-viz/app`** (thin shell):
- Left shelf UI (file picker, paste toggle, reload, zoom controls)
- File loading (File System Access API + standard fallback)
- Paste input (textarea with debounced re-render)
- Wires core library to the UI

The core library is the portable artifact. It becomes a web component (`<sequence-viewer>`) or VS Code extension engine post-v1. The shell is specific to the standalone web app.

### 2.2 Data Flow

```
Mermaid Text → Parser → AST → Layout Engine → LayoutModel → Canvas Renderer → Pixels
```

Each boundary is a pure function with typed TypeScript input/output. No stage knows about stages before or after it. The LayoutModel is a serializable plain object, not DOM fragments or Canvas commands.

### 2.3 Rendering Target: Canvas Hybrid

**Decision:** Single Canvas for the entire diagram (headers, body, scrollbars). The only DOM elements are the left shelf UI and a hidden ARIA accessibility layer.

**Rationale:** The PRD originally chose DOM rendering with `position: sticky` for headers. During design review, three independent analyses (DOM advocate, Canvas advocate, hybrid advocate) identified a critical conflict: CSS `position: sticky` breaks under CSS `transform: scale()` (Chromium issue #20975, open since 2012, spec-compliant behavior). Since zoom was promoted to v1 MVP (essential at 30+ participant scale), and text selection/Ctrl+F were confirmed as non-requirements, Canvas became the stronger choice.

**What Canvas gives us:**
- Zoom via `ctx.scale()` — no sticky/transform conflict
- Viewport culling — only draw visible rows
- Sticky headers via draw pass ordering — skip Y translation for header pass
- Label clamping via arithmetic — no DOM queries, no layout thrashing
- v1.1+ features (highlight, minimap, animation) are Canvas-native

**What we accept:**
- No text selection on diagram content (confirmed non-requirement)
- No browser Ctrl+F search (confirmed non-priority)
- Accessibility requires explicit ARIA layer (~60 lines)
- Custom scrollbar rendering

### 2.4 Rendering Passes

The Canvas renderer draws in three passes per frame:

**Pass 1 — Diagram Body:**
```
ctx.save()
ctx.scale(zoom, zoom)
ctx.translate(-camera.x, -camera.y)
```
Draws: structural block backgrounds, lifelines (dashed verticals), activation bars, arrows (8 types), message labels (with viewport clamping), notes, autonumber badges.

**Pass 2 — Sticky Header:**
```
ctx.save()
ctx.scale(zoom, zoom)
ctx.translate(-camera.x, 0)  // Y translation = 0 → pinned at top
```
Draws: opaque background fill, participant boxes, participant labels, divider line.

**Pass 3 — Screen Chrome:**
```
// No transform — screen pixel coordinates
```
Draws: scrollbar tracks and thumbs, viewport position indicator.

### 2.5 No Footer

The PRD specified participant boxes repeated at the bottom of the diagram. With sticky headers always visible at the top, the footer is redundant. Removed.

---

## 3. Stack Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Type safety for AST/LayoutModel interfaces |
| Framework | None (vanilla TS) | DOM footprint too small to justify React. Core must be portable. |
| Styling | Tailwind CDN | Shell UI only. No build-time CSS dependency. |
| Build tool | Vite | Fast dev, TypeScript native, optimal production bundle |
| Testing | Vitest (unit) + Playwright (visual) | Parser/layout are pure functions. Scroll/zoom need a real browser. |
| Mermaid dependency | None | Custom parser owns the AST. Mermaid is syntax target only. |
| CSS framework in core | None | Core library has zero DOM dependency |

---

## 4. Parser

### 4.1 Approach

Purpose-built recursive descent parser. The `sequenceDiagram` syntax is line-oriented with shallow block nesting. Each line is one of: a directive, a participant declaration, a message, a block opener/closer, or a comment. No operator precedence, no expression parsing. Estimated at 300-500 lines of TypeScript.

### 4.2 AST Schema

```typescript
interface SequenceDiagramAST {
  title?: string
  autonumber: boolean
  participants: Participant[]
  messages: Message[]
  blocks: StructuralBlock[]
  activations: Activation[]
}

interface Participant {
  id: string           // internal key
  alias: string        // display name
  type: 'participant' | 'actor'
}

interface Message {
  from: string         // participant id
  to: string           // participant id
  arrow: ArrowType     // '->' | '-->' | '->>' | '-->>' | '-x' | '--x' | '-)' | '--)'
  label: string
  activate?: '+' | '-'
  sequenceIndex: number
}

interface StructuralBlock {
  type: 'loop' | 'alt' | 'opt' | 'note'
  label: string
  startSeq: number     // first contained message index
  endSeq: number       // last contained message index
  depth: number        // nesting level (0-3)
  children?: StructuralBlock[]  // nested blocks
  // alt-specific: else clauses are sub-blocks within the alt
  elseClauses?: { label: string, startSeq: number, endSeq: number }[]
  // note-specific: placement and target participants
  placement?: 'left of' | 'right of' | 'over'
  targetParticipants?: string[]  // one for left/right, one or more for over
}

interface Activation {
  participantId: string
  startSeq: number
  endSeq: number
}
```

### 4.3 v1 Parser Scope

**Included:**
- `participant` / `actor` declarations with aliases
- Implicit participants (auto-declared from first message appearance)
- All 8 arrow types: `->`, `-->`, `->>`, `-->>`, `-x`, `--x`, `-)`, `--)`
- Message labels (multi-word, punctuation)
- `loop`, `alt`/`else`, `opt`, `note` blocks — nested up to 4 levels
- `activate` / `deactivate` (including `+` / `-` shorthand on messages)
- `autonumber` (basic enable/disable)
- `title`
- `.md` file extraction (first fenced code block with `mermaid` or `sequenceDiagram` info string)

**Deferred:**
- `box` grouping → v1.1
- `par` / `critical` / `break` blocks → v1.5
- `rect` colored regions → v1.5
- `link` / `properties` → v1.5
- Autonumber format strings → v1.5

---

## 5. Layout Engine

Pure function: `layout(ast: SequenceDiagramAST, measurer: TextMeasurer, config: LayoutConfig) → LayoutModel`.

No side effects, no Canvas dependency beyond text measurement. The `TextMeasurer` interface accepts a string and font spec, returns a width. In production this is backed by `ctx.measureText()`. In unit tests it can be mocked.

### 5.1 Algorithm

1. **Column positioning (auto-width):** Measure each participant label. Add padding (min column width: 120px). Position columns left-to-right, accumulating widths. Output: `{ participantId, x (center), width }` per column.

2. **Row positioning:** Fixed row height (40px base) adjusted for multi-line labels, notes (taller rows), and block openers/closers. Output: `{ messageIndex, y, height, arrow endpoints }` per row.

3. **Structural block bounding boxes:** Walk the block tree (max depth: 4). Compute `{ x, y, width, height }` from contained message rows. Indent nested blocks (8px per level).

4. **Activation bars:** Walk activation pairs. Compute `{ participantId, startY, endY, nestLevel }`.

5. **Total dimensions:** `width` = sum of all column widths. `height` = sum of all row heights + header height.

### 5.2 LayoutModel Schema

```typescript
interface LayoutModel {
  width: number          // total diagram width
  height: number         // total diagram height
  headerHeight: number   // height of sticky header region
  columns: ColumnLayout[]
  rows: RowLayout[]
  blocks: BlockLayout[]
  activations: ActivationLayout[]
}

interface ColumnLayout {
  participantId: string
  label: string
  x: number              // center x position
  width: number           // auto-sized from label
}

interface RowLayout {
  messageIndex: number
  y: number
  height: number
  arrow: { fromX: number, toX: number, type: ArrowType }
  label: { text: string, midX: number, y: number }
}

interface BlockLayout {
  type: string
  label: string
  x: number
  y: number
  width: number
  height: number
  depth: number
}

interface ActivationLayout {
  participantId: string
  x: number
  startY: number
  endY: number
  nestLevel: number
}
```

---

## 6. Viewport Controller

The viewport is a virtual camera with three properties: `{ x: number, y: number, zoom: number }`.

### 6.1 Input Mapping

| Input | Action |
|---|---|
| Mouse wheel (vertical) | Pan vertically (`camera.y`) |
| Shift + mouse wheel | Pan horizontally (`camera.x`) |
| Ctrl/Cmd + mouse wheel | Zoom around cursor (`camera.zoom`) |
| Click + drag | Pan (`camera.x`, `camera.y`) |

All input flows through one `ViewportController` that owns the camera state. The renderer reads from the camera on each `requestAnimationFrame`. One source of truth.

### 6.2 Custom Scrollbars

Since the Canvas is not a native scroll container, scrollbar indicators are rendered in draw pass 3. Thin tracks at the right and bottom edges. Thumb position and size derived from `camera` position relative to diagram dimensions. Draggable for direct scroll control.

---

## 7. Label Clamping

The flagship UX feature. When a message arrow's midpoint is scrolled off the visible horizontal viewport, the label clamps to the nearest visible edge with a directional arrow glyph.

```typescript
// For each visible message row:
const midX = (arrow.fromX + arrow.toX) / 2
const viewLeft = camera.x + LABEL_PAD
const viewRight = camera.x + (viewportWidth / camera.zoom) - LABEL_PAD

if (midX < viewLeft) {
  drawLabel(viewLeft, rowY, '← ' + label)   // clamped left
} else if (midX > viewRight) {
  drawLabel(viewRight, rowY, label + ' →')   // clamped right
} else {
  drawLabel(midX, rowY, label)               // normal centered
}
```

Pure arithmetic on camera position and precomputed layout values. No DOM queries. Sub-microsecond per label.

---

## 8. UI Shell

### 8.1 Left Shelf (v1 minimal)

Collapsible shelf on the left side of the viewport. ~36px when collapsed (icon buttons only). Contains:

- File open button (File System Access API picker, fallback to standard `<input type="file">`)
- Paste toggle (switches to textarea mode)
- Reload button (visible when file is loaded via picker; re-reads file handle)
- Zoom indicator + zoom in/out buttons + reset

The shelf is built with vanilla TypeScript + Tailwind CDN classes. It is the only DOM in the application besides the Canvas element and hidden ARIA layer.

### 8.2 File Loading

- **File System Access API** (Chrome/Edge): returns `FileSystemFileHandle` for re-reading on demand. Reload button re-reads without re-picking.
- **Standard file input** (fallback): one-time load. No reload button. User must re-pick to update.
- **Drag-and-drop**: supported via `DataTransfer` API. No persistent handle, no reload.
- **Paste input**: textarea with 300ms debounced re-render. Persisted to `localStorage`.
- **`.md` files**: parser extracts first fenced code block with `mermaid` or `sequenceDiagram` info string.

---

## 9. Version Roadmap

### v1 MVP
- Canvas rendering with three draw passes
- Sticky participant headers (pinned at canvas top)
- Persistent message labels with viewport clamping
- Virtual camera scroll/pan
- Zoom (Ctrl/Cmd + wheel, around cursor)
- File reload (File System Access API + standard fallback)
- Paste input with localStorage persistence
- Purpose-built parser (full v1 syntax scope)
- Auto-width columns
- Structural block nesting up to 4 levels
- Collapsible left shelf (minimal)
- Custom scrollbar indicators
- Desktop only (Chrome/Edge primary, Firefox best-effort)
- Target: <500ms render for 100-message diagram, <100KB gzipped bundle

### v1.1
- `box` grouping (parser + layout + renderer)

### v1.5
- Click-to-highlight actor flow (multi-select, `globalAlpha` dimming)
- `par` / `critical` / `break` blocks
- `rect` colored regions
- Autonumber format strings

### v1.7
- Expanded left shelf (diagram info, paste textarea in shelf, settings, theme switcher)
- Auto-reload (opt-in polling on file change)
- Scroll position preservation across reloads
- Touch support (pinch zoom, touch pan)
- URL-based loading (gzip query parameter, shareable links)

### Post-v1 Deployment Targets
- **npm package / web component**: export `@seq-viz/core` as `<sequence-viewer>` custom element
- **VS Code extension**: WebView panel hosts the core library

---

## 10. Project Structure

```
sequence-diagram-visualizer/
  packages/
    core/                           # @seq-viz/core — zero deps
      src/
        parser/
          index.ts                  # parse(text) → AST
          tokenizer.ts              # line-by-line tokenization
          types.ts                  # AST type definitions
        layout/
          index.ts                  # layout(ast, measurer, config) → LayoutModel
          columns.ts                # auto-width column positioning
          rows.ts                   # row height calculation
          blocks.ts                 # structural block bounding boxes
          types.ts                  # LayoutModel type definitions
        renderer/
          index.ts                  # render(ctx, layout, camera)
          arrows.ts                 # arrow drawing (all 8 types)
          labels.ts                 # label drawing + viewport clamping
          headers.ts                # sticky header draw pass
          lifelines.ts              # vertical dashed lines
          blocks.ts                 # structural block frames
          theme.ts                  # colors, fonts, spacing config
        viewport/
          camera.ts                 # camera state + update logic
          input.ts                  # mouse/wheel/keyboard → camera
          scrollbars.ts             # custom scrollbar rendering
        index.ts                    # public API: createViewer(canvas, options)
      tests/
        parser/                     # unit tests (Vitest)
        layout/                     # unit tests (Vitest)
        fixtures/                   # .mmd test corpus

    app/                            # @seq-viz/app — thin shell
      src/
        shelf.ts                    # collapsible left shelf
        file-loader.ts              # File System Access API + fallback
        paste-input.ts              # textarea with debounced render
        main.ts                     # wire core to shell
      index.html                    # Tailwind CDN, single page

  vite.config.ts                    # workspace config
  tsconfig.json
  package.json                      # workspace root
```

---

## 11. Core Public API

```typescript
import { createViewer } from '@seq-viz/core'

const viewer = createViewer(canvasElement, {
  theme: 'dark',
  onError: (err) => { /* handle parse/render errors */ },
})

viewer.load(mermaidText)       // parse + layout + render
viewer.zoomTo(0.5)             // set zoom level
viewer.resetView()             // reset camera to origin
viewer.resize()                // recalculate on container resize
viewer.destroy()               // cleanup event listeners

// Read-only state
viewer.camera                  // { x, y, zoom }
viewer.ast                     // parsed AST
viewer.layout                  // computed LayoutModel
```

---

## 12. Testing Strategy

**Unit tests (Vitest):**
- Parser: fixture corpus of `.mmd` files with expected AST output
- Layout engine: given AST + config, assert positions and dimensions
- Label clamping: given camera state + layout, assert clamped positions
- Markdown extraction: given `.md` content, assert extracted mermaid block

**Visual tests (Playwright):**
- Sticky headers: scroll down, screenshot-assert headers render at top
- Label clamping: scroll right, screenshot-assert labels clamp to edge
- Zoom: zoom in/out, assert headers scale correctly
- File reload: load file, modify, reload, assert re-render

---

## 13. Open Questions Resolved

| Question (from PRD) | Resolution |
|---|---|
| Parser fixture corpus source | Synthetic diagrams + real-world samples in test-data/. Mermaid's test fixtures as read-only reference. |
| Column width strategy | Auto-sized based on participant label length. Min 120px. |
| Structural block nesting depth | Up to 4 levels. |
| Mobile / touch | Desktop only for v1. Touch support deferred to v1.7. |
