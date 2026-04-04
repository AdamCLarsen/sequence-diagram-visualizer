# PRD: Sequence Diagram Interactive Visualizer
**Status:** Draft v0.2  
**Visibility:** Private  
**Type:** Open Source (Pre-Release)

---

## 1. The Problem We Are Actually Solving

Mermaid has won the sequence diagram syntax war. It is readable, portable, and AI-native, meaning agents can generate and consume it fluently. **BUT** Mermaid's rendering output is a flat, static SVG compiled at parse time. The browser has no awareness that the SVG contains headers, lines, or labels. It treats the entire diagram as a single image. Beyond the functional failures, Mermaid's visual output for sequence diagrams is generic and difficult to read at scale.

**THEREFORE**, as a diagram grows beyond roughly 8-10 participants or 30+ messages, the viewer loses two things that are critical for comprehension:

1. **Orientation** -- participant headers scroll off the top of the viewport, and the reader no longer knows which column belongs to which actor.
2. **Message legibility** -- message labels are anchored to the geometric center of their arrow. When a wide diagram is scrolled horizontally, the label disappears off-screen even though both endpoints are still visible.

No existing Mermaid-native tooling solves this, because the constraint is architectural, not a configuration gap. The SVG is already compiled and the visual language is fixed. **THEREFORE**, the solution is not to patch Mermaid's output or depend on Mermaid's infrastructure at all. It is to parse the syntax directly, own the AST, own the visual language, and build a DOM-native renderer that treats headers and labels as first-class scrollable citizens.

---

## 2. Product Vision

A web-based, read-only interactive viewer for Mermaid-compatible `sequenceDiagram` syntax that renders diagrams as live DOM elements with a purpose-built visual language. The viewer solves the scroll problem categorically: headers are always visible, labels are always legible, and the diagram can be navigated at any scale without losing spatial context. Mermaid is the syntax standard. Everything else -- parsing, layout, visual design -- is owned by this project.

**The reader should never have to scroll back to the top to remember who is talking to whom.**

---

## 3. The Core Architectural Decisions (and Why They Are Non-Negotiable)

### 3.1 Rendering Target: DOM, Not Canvas or WebGL

Three rendering targets were evaluated:

| Approach | What You Get | What It Costs You |
|---|---|---|
| **SVG patching** | Free Mermaid output to start from | Sticky headers require per-frame absolute coordinate recalculation. Label clamping has no DOM identity to work with. You are fighting the output format permanently. |
| **Canvas** | Full pixel control, clean visual output | Sticky headers, label clamping, hit testing, text selection, and accessibility all require manual re-implementation. The browser's layout engine is discarded entirely. Hundreds of lines of geometry code to replicate what CSS gives for free. |
| **WebGL** | GPU-accelerated rendering, 3D capable | Designed for shader pipelines and millions of vertices. A sequence diagram has rectangles, lines, and text. The complexity cost is enormous. The benefit is zero. |
| **DOM (chosen)** | Every element is a real node with real CSS behavior | Requires a custom layout engine. No shortcuts on the hard work up front. |

**We use DOM.** The sticky header problem is solved in one CSS declaration: `position: sticky`. Label clamping uses `getBoundingClientRect()` against real DOM nodes. Click-to-highlight is a standard `addEventListener`. Text is selectable. The browser's layout engine does the geometry. Canvas and WebGL earn their complexity cost when you have thousands of animated nodes or GPU-bound visual requirements. This project has neither.

### 3.2 Parser: Purpose-Built, No Mermaid Dependency

Two parser strategies were evaluated:

| Approach | What You Get | What It Costs You |
|---|---|---|
| **Mermaid npm package (parser only)** | Syntax compatibility, no parsing work | Mermaid's internal AST is undocumented and not a stable public contract. A version bump can break the renderer silently. The visual output is locked to Mermaid's aesthetic decisions. The bundle carries the full Mermaid library for a feature we only partially use. |
| **Purpose-built parser (chosen)** | Owned, stable, documented AST. Full visual freedom. Zero upstream dependency risk. Smaller bundle. | Upfront parsing work, estimated at 300-500 lines of JavaScript. |

**We build our own parser.** The `sequenceDiagram` syntax is a line-oriented DSL with no operator precedence and only shallow block nesting. Parsing it is a focused, bounded problem. Mermaid's effort went into supporting every diagram type, a general-purpose grammar engine, and a decade of edge cases across a broad contributor base. We are solving one diagram type. The scope is not comparable.

Mermaid is the **syntax compatibility target**, not a dependency. The goal is that any valid Mermaid `sequenceDiagram` file that uses supported syntax renders correctly. Mermaid's npm package does not ship with this project.

**v1 parser scope -- included:**

| Feature | Notes |
|---|---|
| `participant` / `actor` declarations with aliases | `actor` renders as a participant box in v1; shape variant is cosmetic and deferred |
| All arrow types (`->`, `-->`, `->>`, `-->>`, `-x`, `--x`, `-\)`, `--\)`) | Full fidelity |
| Message labels | Including multi-word and punctuation |
| `loop`, `alt`, `else`, `opt`, `note` blocks | Core structural primitives |
| `activate` / `deactivate` (including `+` / `-` shorthand) | |
| `autonumber` | Basic enable/disable; format strings deferred |
| `title` | |

**v1 parser scope -- deferred:**

| Feature | Reason |
|---|---|
| `par` / `critical` / `break` blocks | Rarely used; complex parallel layout |
| `rect` colored regions | Cosmetic; not structural |
| `link` / `properties` | Mermaid v10+ interactive additions; niche usage |
| Autonumber format strings | Edge case; basic autonumber ships |

---

## 4. User Personas

**Primary: The Architect Reviewer**
Working with a large system diagram that was generated by an AI agent or exported from another tool. They are in read-only mode. They need to trace a specific message flow across many participants without losing their place.

**Secondary: The Technical Writer / Documentation Consumer**
Reviewing architecture documentation in a web portal. They did not write the diagram. They need it to be navigable without any setup or tooling installed.

---

## 5. Input Specification

The viewer accepts Mermaid `sequenceDiagram` syntax via two entry paths:

### 5.1 Paste Input
- A textarea accepts raw Mermaid text.
- The diagram re-renders on a debounced input event (300ms).
- Input is preserved in `localStorage` across sessions so the user does not lose their work on a refresh.

### 5.2 File Load
- The file picker uses the **File System Access API** (`window.showOpenFilePicker()`) rather than a standard `<input type="file">`. This is a deliberate architectural choice, not a convenience. A standard file input gives a one-time snapshot. The File System Access API returns a persistent `FileSystemFileHandle` that the app holds in memory and can re-read at any time without re-opening the picker.
- Accepted file types: `.mmd` and `.md`.
- For `.md` files, the parser extracts the first fenced code block with a `mermaid` or `sequenceDiagram` declaration.
- Drag-and-drop onto the viewer surface is supported as an alternative to the picker. Note: drag-and-drop uses the standard `DataTransfer` API and does not yield a `FileSystemFileHandle`. A dragged file therefore cannot be reloaded without re-dropping. The UI makes this distinction clear.
- **Browser compatibility:** File System Access API is fully supported in Chrome and Edge. Firefox support is behind a flag as of early 2026. Safari does not support it. Given the primary use case (developer tooling alongside Claude Code), Chrome/Edge coverage is acceptable for v1. The UI surfaces a clear warning on unsupported browsers and falls back to standard file input (one-time load only).

**Out of Scope for v1:** URL-based diagram loading, shareable links, cloud storage sync.

---

## 6. MVP Feature Set (Priority Ordered)

The following features are listed in priority order. The first four constitute the minimum viable product. Features 5 and 6 are v1.1 targets. One additional feature is marked "Phase 1 Nice-to-Have."

### Priority 1: Sticky Participant Headers (MVP Core)
The participant row (the boxes at the top of the diagram showing actor names) must remain pinned to the top of the scroll container at all times. As the user scrolls down through a long sequence, the headers never leave the viewport.

**Behavior:**
- Participant boxes render in a fixed header row inside the scroll container (not the browser window, the diagram's own scroll container, so it does not interfere with page-level layout).
- The header row scrolls horizontally in sync with the diagram body but does not scroll vertically.
- Participant "feet" (the bottom boxes that Mermaid renders at the bottom of many diagrams) are rendered in a fixed footer row using the same mechanism.

### Priority 2: Persistent Message Labels (MVP Core)
Message labels must remain legible when the horizontal center of a message arrow is scrolled off-screen.

**Behavior:**
- Each message label is a DOM element, not an SVG text node.
- When the arrow's midpoint is outside the visible horizontal viewport, the label clamps to the nearest visible edge with a directional indicator (arrow glyph pointing toward the off-screen endpoint).
- When the arrow's midpoint is in view, the label renders centered on the arrow, as expected.
- This is the flagship UX differentiator. It should receive disproportionate design and testing attention.

### Priority 3: Synchronized Horizontal Scroll with Locked Row Headers (MVP Core)
Wide diagrams require horizontal scrolling. **BUT** horizontal scrolling that moves the participant columns without a stable reference point destroys spatial orientation. **THEREFORE** the horizontal scroll must move the diagram body and the header row in lockstep, while vertical position of the header remains fixed.

**Behavior:**
- Diagram body and participant header row are separate DOM elements sharing a single scroll controller.
- `scrollLeft` is synchronized between them via a single scroll event listener.
- No jitter or desync on rapid scroll input.

### Priority 4: Single-Button Live File Reload (MVP Core)

The primary real-world workflow is: file is open in the viewer, Claude Code edits and saves the `.mmd` or `.md` file on disk, the user wants to see the updated diagram without re-picking the file and without losing their current position in the diagram.

**The problem this solves:** Browsers cannot watch the file system passively. A standard file input cannot re-read a file after initial load. **THEREFORE** the File System Access API (see section 5.2) is what makes this possible: the app holds a `FileSystemFileHandle` in memory and re-reads it on demand.

**Behavior:**
- When a file is loaded via the file picker, a "Reload" button becomes permanently visible in the toolbar. It is always one click. No dialog, no confirmation, no re-picking.
- The button reads the current contents of the file from disk, re-parses, and re-renders.
- If the file has not changed since the last load (detected via `lastModified` timestamp comparison), the reload still completes silently. No error, no "nothing changed" toast.
- If the file is no longer accessible (deleted, moved, permissions changed), the UI surfaces a clear error and retains the last successfully rendered diagram.
- When a file is loaded via drag-and-drop (which yields no `FileSystemFileHandle`), the Reload button is not shown. The UI indicates the file must be re-dropped or re-picked to update.
- Paste input has no Reload button. It re-renders live on input.

**What is explicitly not in Phase 1:** Automatic reload on file change (polling or push). The user initiates every reload. This is the correct default because auto-reload while someone is mid-analysis is disruptive. Auto-reload is a v1.1 opt-in toggle built on the same mechanism.

---

### Phase 1 Nice-to-Have: Scroll Position Preservation Across Reloads

When the user clicks Reload, a naive re-render resets `scrollTop`, `scrollLeft`, and zoom level to their defaults. For a user mid-way through analyzing a large diagram, this is disorienting.

**Why this is a nice-to-have and not core:** The reload itself is what matters. A reset to the top-left is acceptable behavior for Phase 1. Position preservation makes the workflow significantly more fluid, but an imperfect implementation is worse than no implementation (e.g., restoring to the wrong message after a structural change).

**Target behavior if implemented in Phase 1:**
- Before re-render, record: (a) the sequence index of the topmost message row that is more than 50% visible vertically, and (b) the name of the leftmost participant column that is fully visible horizontally. Also record current zoom level.
- After re-render, scroll to the new DOM position of that sequence index and participant column. Restore zoom level unconditionally.
- Fallback: if the anchor message or participant was deleted by Claude Code in the edit, scroll to the top-left origin. Do not attempt to guess a nearby substitute.
- Zoom level is always preserved across reloads, even if scroll position is not. This is the minimum acceptable behavior and should be treated as core even if full position restoration is cut.

---

### Priority 5: Zoom and Pan (v1.1)
For very large diagrams, pixel-level navigation is insufficient. The user needs to zoom out to see the full structure, then zoom in on a specific region.

**Behavior:**
- Mouse wheel zoom (with Ctrl/Cmd held) scales the diagram container.
- Pinch-to-zoom on touch devices.
- A zoom level indicator and reset button are always visible.
- Zoom does not break sticky header behavior (headers scale with the diagram).

### Priority 6: Click-to-Highlight Actor Flow (v1.1)
When working with a diagram that has 15+ participants, finding all messages involving a specific actor is a manual scan. **THEREFORE** clicking a participant header should highlight all messages that originate from or terminate at that actor, dimming everything else.

**Behavior:**
- Click a participant header to activate highlight mode for that actor.
- All arrows involving the selected actor are rendered at full opacity with a distinct color treatment.
- All other arrows and labels are dimmed to 20% opacity.
- Click the header again or click the background to clear the highlight.
- Multiple actors can be selected simultaneously (additive highlight).

---

## 7. Rendering Architecture

### 7.1 Parse Stage
A purpose-built JavaScript parser reads the raw diagram text line by line and produces a clean, documented AST. The parser is the first module written and has its own unit test suite independent of the renderer. The AST schema is defined and versioned by this project. No external parsing library is used.

The AST output contains:
- Participant list (ordered, with aliases and declared types)
- Message list (source, target, arrow type, label, sequence index, activation state)
- Structural blocks (loops, alts/elses, opts, notes) with their contained message ranges
- Diagram metadata (title, autonumber flag)

### 7.2 Layout Engine
A pure JavaScript layout engine takes the AST as input and computes:
- Column positions for each participant (evenly distributed by default, with a minimum column width).
- Row heights for each message, accounting for label length and structural block nesting depth.
- Bounding boxes for all structural blocks (alt/loop/opt frames).

### 7.3 DOM Renderer
The layout engine output drives DOM construction:

```
ScrollContainer (overflow: auto, both axes)
  ├── HeaderRow (position: sticky, top: 0, z-index: 10)
  │     └── ParticipantBox × N
  ├── DiagramBody
  │     ├── MessageRow × M
  │     │     ├── ArrowLine (SVG fragment, not full SVG)
  │     │     └── MessageLabel (DOM span, clamped)
  │     └── StructuralBlock × K (alt/loop/opt frames)
  └── FooterRow (position: sticky, bottom: 0, z-index: 10)
        └── ParticipantBox × N
```

Note: Arrow lines use inline SVG fragments (one `<svg>` per row, not one global SVG). This preserves DOM identity for each arrow while avoiding the coordinate-space problem of a single flat SVG.

### 7.4 Scroll Controller
A single scroll event listener on the `ScrollContainer`:
- Syncs `scrollLeft` of `HeaderRow` to `DiagramBody.scrollLeft`.
- Triggers label clamping recalculation for any labels whose midpoints are outside the current viewport.
- Is debounced to 16ms (one animation frame) to avoid layout thrashing.

---

## 8. Deployment Strategy

The v1 target is a **standalone web application** (no backend, fully client-side). This is the right first target because:
- Zero infrastructure cost to deploy.
- Zero installation friction for the user.
- The entire feature set is client-side by nature (parsing and rendering happen in the browser).
- It functions as the reference implementation for all future deployment targets.

**Subsequent deployment targets (post-v1):**

| Target | Mechanism | Dependency on v1 |
|---|---|---|
| npm package / embeddable widget | Export the rendering engine as a web component (`<sequence-viewer>`) | Requires clean separation of input UI from core renderer (should be designed in from day one) |
| VS Code extension | WebView panel hosts the standalone app | Zero additional rendering work; the extension is a shell |

**Architecture requirement:** The rendering engine (parse + layout + DOM render) must be implemented as a framework-agnostic module with zero coupling to the input UI. The input UI is a thin wrapper. This decision costs nothing at build time and enables all three deployment targets from the same codebase.

---

## 9. Technical Constraints and Stack Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Mermaid dependency | **None** | Custom parser owns the AST. Mermaid is the syntax compatibility target, not a library. |
| Parser implementation | Vanilla JS, hand-written recursive descent | The grammar is simple enough that a parser generator adds more complexity than it removes. |
| Framework | Vanilla JS or lightweight framework (TBD) | No framework overhead for a rendering engine; keep the embeddable bundle small. |
| Visual design | Purpose-built design system, CSS custom properties | Not inheriting Mermaid's aesthetic. Full control over typography, spacing, color, and arrow styling from day one. |
| Styling | CSS custom properties + a single stylesheet | Theming support with zero framework dependency. |
| Build tool | Vite | Fast dev loop; produces an optimal standalone HTML/JS bundle. |
| Testing | Playwright for scroll behavior; unit tests for parser and layout engine | Scroll pinning bugs are visual and require a real browser to catch. Parser correctness is verified with a fixture corpus of known-good diagrams. |

---

## 10. Out of Scope for v1

The following are explicitly deferred to prevent scope creep:

- **Auto-reload on file change (polling).** The file is re-read only when the user clicks Reload. Polling-based auto-reload is a v1.1 opt-in toggle built on the same `FileSystemFileHandle` mechanism. It is not a v1 deliverable.
- **Edit mode.** The input is fixed after load. The architecture must not block editing, but the v1 product does not implement it.
- **Diagram types other than `sequenceDiagram`.** The layout engine is built specifically for sequence diagram semantics. Other Mermaid diagram types (flowchart, ER, Gantt) have fundamentally different layout problems.
- **Shareable URLs / cloud storage.**
- **Export to PNG/SVG/PDF.** Ironic given the problem statement, but exporting a flat image is a solved problem. This tool's value is in the interactive view.
- **Theming UI.** CSS custom properties are wired in from day one, but a theme switcher UI is not a v1 deliverable.
- **Syntax error UX.** v1 shows a basic error message when the parser rejects input. A rich inline error experience with line-level highlighting is a later priority.

---

## 11. Success Criteria for v1

| Metric | Target |
|---|---|
| Participant headers remain visible during vertical scroll | 100% of test cases across Chrome, Firefox, Safari |
| Message labels remain legible (clamped or centered) during horizontal scroll | 100% of test cases |
| Diagram loads and renders from paste input | Under 500ms for a 100-message diagram |
| Diagram loads and renders from `.mmd` file | Under 500ms for a 100-message diagram |
| Horizontal scroll sync jitter | Zero visible desync at any scroll speed |
| Reload button re-reads and re-renders from disk | Under 300ms for a 100-message diagram on supported browsers |
| Parser correctly handles all v1 supported syntax features | 100% pass rate against fixture corpus |
| Bundle size (standalone app, gzipped) | Under 100KB -- no Mermaid library in the bundle |

---

## 12. Open Questions

1. **Parser fixture corpus.** A corpus of known-good Mermaid `sequenceDiagram` files is needed to validate parser correctness against real-world input. Where does this corpus come from? Options include scraping public GitHub repositories, generating synthetic diagrams, or using the Mermaid project's own test fixtures as a reference (read-only, not a code dependency).
2. **Column width strategy.** Should column widths be fixed and equal, or should they auto-size based on participant label length? Auto-sizing is more readable but complicates the layout engine.
3. **Structural block rendering.** Alt/loop/opt frames are visually complex when nested. How deep does v1 support go? A pragmatic choice is to render frames as full-width highlighted regions rather than column-scoped boxes in v1.
4. **Mobile / touch.** The primary use case is desktop (large diagrams on large screens). Is basic touch support (pinch zoom, scroll) required for v1, or is desktop-first acceptable?
