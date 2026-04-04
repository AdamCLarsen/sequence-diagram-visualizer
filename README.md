# Sequence Diagram Visualizer

A web-based, read-only interactive viewer for Mermaid `sequenceDiagram` syntax. Renders diagrams as Canvas 2D draw calls with sticky participant headers, persistent message labels with viewport clamping, zoom, pan, and file reload.

Mermaid is the syntax compatibility target, not a dependency.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. A demo diagram loads automatically.

## Usage

- **Open a file** — click the folder icon in the left shelf to load `.mmd`, `.mermaid`, `.md`, or `.txt` files
- **Drag and drop** — drop a diagram file onto the canvas
- **Paste** — click the keyboard icon to toggle a paste textarea (persisted to localStorage)
- **Reload** — when a file is opened via the file picker (Chrome/Edge), the reload button re-reads the file without re-picking
- **Zoom** — Ctrl/Cmd + mouse wheel zooms around cursor, or use shelf +/- buttons
- **Pan** — click and drag, or scroll vertically / Shift+scroll horizontally

Markdown files (`.md`) are supported — the parser extracts the first fenced code block with a `mermaid` or `sequenceDiagram` info string.

## Project Structure

Two-package monorepo:

```
packages/
  core/       @seq-viz/core — portable library, zero dependencies
    src/
      parser/       Mermaid sequenceDiagram text → AST
      layout/       AST → LayoutModel (positions, dimensions)
      renderer/     LayoutModel → Canvas 2D draw calls (3-pass)
      viewport/     Virtual camera, zoom, pan, custom scrollbars
      index.ts      Public API: createViewer(canvas, options)

  app/        @seq-viz/app — thin web shell
    src/
      main.ts         Wires core to shell
      shelf.ts        Collapsible left shelf UI
      file-loader.ts  File System Access API + fallback
      paste-input.ts  Textarea with debounced re-render
    index.html        Entry point (Tailwind CDN)
```

## Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (core then app)
npm test           # Run unit tests (Vitest)
npm run test:watch # Run tests in watch mode
```

## Supported Syntax

All standard Mermaid `sequenceDiagram` features for v1:

- `participant` / `actor` declarations with `as` aliases
- Implicit participants (auto-declared from first message)
- All 8 arrow types: `->` `-->` `->>` `-->>` `-x` `--x` `-)` `--)`
- Message labels
- `loop`, `alt`/`else`, `opt`, `note` blocks (nested up to 4 levels)
- `activate` / `deactivate` (including `+`/`-` shorthand)
- `autonumber`
- `title`

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | None (vanilla TS) |
| Build | Vite |
| Testing | Vitest |
| Rendering | Canvas 2D |
| Shell styling | Tailwind CDN |

## Browser Support

Desktop only for v1. Chrome and Edge are primary targets; Firefox is best-effort.
