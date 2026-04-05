# Sequence Diagram Visualizer

A fast, interactive viewer for [Mermaid](https://mermaid.js.org/) `sequenceDiagram` syntax. Renders directly to Canvas 2D with smooth zoom, pan, and sticky headers — no Mermaid runtime required.

**[Live Demo](https://adamclarsen.github.io/sequence-diagram-visualizer/)**

## Features

- **Canvas 2D rendering** — no DOM-based SVG, no Mermaid dependency; just fast draw calls
- **Pan and zoom** — click-drag to pan, scroll to zoom (Ctrl/Cmd + wheel), pinch-to-zoom on trackpad
- **Sticky participant headers** — headers stay visible as you scroll through long diagrams
- **URL sharing** — diagram state is compressed into the URL for easy sharing
- **Dark mode** — toggle between light and dark themes
- **File loading** — open `.mmd`, `.mermaid`, `.md`, or `.txt` files via file picker or drag-and-drop
- **Markdown support** — extracts the first `mermaid` or `sequenceDiagram` fenced code block from `.md` files
- **Live paste** — paste diagram text directly with real-time re-rendering
- **Participant selection** — click participants to highlight their messages
- **Diagram colors** — respects `box` color annotations from the diagram source
- **Hot reload** — re-reads the opened file without re-picking (Chrome/Edge File System Access API)

## Supported Syntax

Parses standard Mermaid `sequenceDiagram` syntax:

- `participant` / `actor` declarations with `as` aliases
- All 8 arrow types: `->` `-->` `->>` `-->>` `-x` `--x` `-)` `--)`
- Message labels and `autonumber`
- `loop`, `alt`/`else`, `opt`, `critical`, `break`, `par` blocks (nested)
- `note left of` / `right of` / `over` (multi-line)
- `activate` / `deactivate` (including `+`/`-` shorthand on arrows)
- `box` grouping with optional colors
- `rect` highlight regions
- `title`

## Getting Started

```bash
git clone https://github.com/AdamCLarsen/sequence-diagram-visualizer.git
cd sequence-diagram-visualizer
npm install
npm run dev
```

Open `http://localhost:5173`. A demo diagram loads automatically.

## Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (core then app)
npm test           # Run unit tests (Vitest)
npm run test:watch # Tests in watch mode
```

## Architecture

Two-package monorepo with zero runtime dependencies:

```
packages/
  core/       @seq-viz/core — portable rendering library
    parser/     Mermaid text → AST
    layout/     AST → positioned layout model
    renderer/   Layout → Canvas 2D draw calls
    viewport/   Virtual camera, input handling, scrollbars
    serializer  AST → Mermaid text (for URL sharing)

  app/        @seq-viz/app — thin web shell
    main.ts       Wires core to the browser
    shelf.ts      Collapsible toolbar UI
    file-loader   File System Access API + drag-and-drop
    paste-input   Live textarea input
    url-sharing   Compress/decompress diagrams for URL params
```

The core library has no DOM dependency and can be embedded in any Canvas-based application.

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | None (vanilla) |
| Rendering | Canvas 2D |
| Build | Vite |
| Testing | Vitest |
| Styling | Tailwind CSS |

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

```bash
# Run tests before submitting
npm test
```

## License

[MIT](LICENSE) -- Adam Larsen
