import { createViewer, extractFromMarkdown, serialize, type Viewer, type Camera } from '@seq-viz/core'
import { openFile, reloadFile, readDroppedFile, type FileLoadResult } from './file-loader'
import { createPasteInput, type PasteInput } from './paste-input'
import { createShelf } from './shelf'
import { compressDiagram, getSharedParam, decompressDiagram } from './url-sharing'

const SOURCE_LABELS_KEY = 'seq-viz-source-labels'
const DARK_MODE_KEY = 'seq-viz-dark-mode'
const DIAGRAM_COLORS_KEY = 'seq-viz-diagram-colors'

let viewer: Viewer
let currentHandle: FileSystemFileHandle | null = null
let pasteInput: PasteInput | null = null

/** Serialize the current AST, compress it, and push into the URL ?d= param */
async function updateUrlWithDiagram() {
  const ast = viewer.ast
  if (!ast) return
  try {
    const compressed = await compressDiagram(serialize(ast))
    const url = new URL(window.location.href)
    url.searchParams.set('d', compressed)
    window.history.replaceState(null, '', url.toString())
  } catch (err) {
    console.error('[seq-viz] failed to update URL', err)
  }
}

function init() {
  const canvas = document.getElementById('diagram-canvas') as HTMLCanvasElement
  if (!canvas) throw new Error('Canvas element not found')

  const pasteContainer = document.getElementById('paste-container') as HTMLElement

  let shelf: ReturnType<typeof createShelf>

  // Resolve initial theme: saved preference > system preference
  const savedDark = localStorage.getItem(DARK_MODE_KEY)
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const initialDark = savedDark !== null ? JSON.parse(savedDark) : systemDark

  viewer = createViewer(canvas, {
    theme: initialDark ? 'dark' : 'light',
    onError: (err) => console.error('[seq-viz]', err),
    onCameraChange: (_cam: Camera) => {
      shelf?.updateZoom()
    },
    onSelectionChange: () => {
      shelf?.refresh()
    },
  })

  shelf = createShelf({
    onOpen: handleOpen,
    onReload: handleReload,
    onPasteToggle: (active) => handlePasteToggle(active, pasteContainer),
    onShareLink: async () => { await navigator.clipboard.writeText(window.location.href) },
    onZoomIn: () => { viewer.zoomTo(viewer.camera.zoom * 1.2); shelf.updateZoom() },
    onZoomOut: () => { viewer.zoomTo(viewer.camera.zoom / 1.2); shelf.updateZoom() },
    onZoomReset: () => { viewer.resetView(); shelf.updateZoom() },
    getZoom: () => viewer.camera.zoom,
    onSourceLabelsToggle: (enabled) => {
      viewer.showSourceLabels = enabled
      localStorage.setItem(SOURCE_LABELS_KEY, JSON.stringify(enabled))
    },
    getSourceLabels: () => viewer.showSourceLabels,
    onDarkModeToggle: (dark) => {
      viewer.setTheme(dark ? 'dark' : 'light')
      document.body.className = dark ? 'h-full bg-black' : 'h-full bg-white'
      localStorage.setItem(DARK_MODE_KEY, JSON.stringify(dark))
    },
    getDarkMode: () => viewer.themeName === 'dark',
    onDiagramColorsToggle: (enabled) => {
      viewer.showDiagramColors = enabled
      localStorage.setItem(DIAGRAM_COLORS_KEY, JSON.stringify(enabled))
    },
    getDiagramColors: () => viewer.showDiagramColors,
    onClearSelection: () => { viewer.clearSelection() },
    getSelectionCount: () => viewer.selectedParticipantIds.length,
    onWidthChange: (widthPx) => {
      canvas.style.left = widthPx + 'px'
      canvas.style.width = `calc(100vw - ${widthPx}px)`
      pasteContainer.style.left = widthPx + 'px'
      viewer.resize()
    },
  })

  document.body.appendChild(shelf.element)

  // Drag and drop
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
  })
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault()
    const result = await readDroppedFile(e)
    if (result) {
      loadContent(result)
      shelf.setFileName(result.name)
      shelf.setReloadVisible(false)
      currentHandle = null
    }
  })

  // Restore settings
  const srcLabelsStored = localStorage.getItem(SOURCE_LABELS_KEY)
  if (srcLabelsStored !== null) {
    viewer.showSourceLabels = JSON.parse(srcLabelsStored)
  }
  const diagramColorsStored = localStorage.getItem(DIAGRAM_COLORS_KEY)
  if (diagramColorsStored !== null) {
    viewer.showDiagramColors = JSON.parse(diagramColorsStored)
  }

  // Set initial body background for theme
  document.body.className = initialDark ? 'h-full bg-black' : 'h-full bg-white'

  // Follow system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem(DARK_MODE_KEY) !== null) return // manual override
    viewer.setTheme(e.matches ? 'dark' : 'light')
    document.body.className = e.matches ? 'h-full bg-black' : 'h-full bg-white'
    shelf.refresh()
  })

  shelf.refresh()

  // Expose viewer for dev tooling (Playwright, console)
  ;(window as any).__viewer = viewer

  // Load from URL ?d= param, or fall back to demo
  const sharedParam = getSharedParam()
  if (sharedParam) {
    decompressDiagram(sharedParam).then((text) => {
      viewer.load(text)
      shelf.setFileName('shared')
    }).catch((err) => {
      console.error('[seq-viz] failed to load shared diagram', err)
      loadDemo()
    })
  } else {
    loadDemo()
  }

  function loadDemo() {
    viewer.load(DEMO_DIAGRAM)
    updateUrlWithDiagram()
  }

  async function handleOpen() {
    const result = await openFile()
    if (result) {
      loadContent(result)
      shelf.setFileName(result.name)
      currentHandle = result.handle ?? null
      shelf.setReloadVisible(!!currentHandle)
    }
  }

  async function handleReload() {
    if (!currentHandle) return
    try {
      const content = await reloadFile(currentHandle)
      viewer.load(maybeExtractMermaid(content, 'reload.md'))
      updateUrlWithDiagram()
    } catch (err) {
      console.error('[seq-viz] reload failed', err)
    }
  }

  function handlePasteToggle(active: boolean, container: HTMLElement) {
    if (active) {
      container.classList.remove('hidden')
      canvas.classList.add('hidden')
      pasteInput = createPasteInput(container, (text) => {
        viewer.load(text)
        updateUrlWithDiagram()
        canvas.classList.remove('hidden')
        viewer.resize()
      })
    } else {
      container.classList.add('hidden')
      canvas.classList.remove('hidden')
      pasteInput?.destroy()
      pasteInput = null
      viewer.resize()
    }
  }
}

function loadContent(result: FileLoadResult) {
  const text = maybeExtractMermaid(result.content, result.name)
  viewer.load(text)
  updateUrlWithDiagram()
}

function maybeExtractMermaid(content: string, name: string): string {
  if (name.endsWith('.md')) {
    return extractFromMarkdown(content) ?? content
  }
  return content
}

const DEMO_DIAGRAM = `sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie

    Alice->>Bob: Hello Bob!
    activate Bob
    Bob-->>Alice: Hi Alice!
    Bob->>Charlie: Hey Charlie
    activate Charlie
    Charlie-->>Bob: What's up?
    deactivate Charlie
    deactivate Bob

    loop Every minute
        Alice->>Bob: Ping
        Bob-->>Alice: Pong
    end

    alt Success
        Bob->>Charlie: Great news
        Charlie-->>Bob: Thanks!
    else Failure
        Bob->>Charlie: Bad news
        Charlie-->>Bob: Oh no
    end

    note over Alice,Bob: This is a note
    note right of Charlie: Solo note
`

document.addEventListener('DOMContentLoaded', init)
