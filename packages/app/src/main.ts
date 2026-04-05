import { createViewer, extractFromMarkdown, type Viewer, type Camera } from '@seq-viz/core'
import { openFile, reloadFile, readDroppedFile, type FileLoadResult } from './file-loader'
import { createPasteInput, type PasteInput } from './paste-input'
import { createShelf } from './shelf'

const STATE_KEY = 'seq-viz-state'
const LABELS_KEY = 'seq-viz-offscreen-labels'
const SOURCE_LABELS_KEY = 'seq-viz-source-labels'
const DARK_MODE_KEY = 'seq-viz-dark-mode'
const DIAGRAM_COLORS_KEY = 'seq-viz-diagram-colors'
const CAMERA_SAVE_MS = 300

interface SavedState {
  diagram: string
  name: string
  camera: { x: number; y: number; zoom: number }
}

function loadSavedState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveState(patch: Partial<SavedState>) {
  const current = loadSavedState()
  localStorage.setItem(STATE_KEY, JSON.stringify({ ...current, ...patch }))
}

let viewer: Viewer
let currentHandle: FileSystemFileHandle | null = null
let pasteInput: PasteInput | null = null
let cameraSaveTimer: ReturnType<typeof setTimeout> | null = null

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
    onCameraChange: (cam: Camera) => {
      shelf?.updateZoom()
      if (cameraSaveTimer) clearTimeout(cameraSaveTimer)
      cameraSaveTimer = setTimeout(() => {
        saveState({ camera: { x: cam.x, y: cam.y, zoom: cam.zoom } })
      }, CAMERA_SAVE_MS)
    },
    onSelectionChange: () => {
      shelf?.refresh()
    },
  })

  shelf = createShelf({
    onOpen: handleOpen,
    onReload: handleReload,
    onPasteToggle: (active) => handlePasteToggle(active, pasteContainer),
    onZoomIn: () => { viewer.zoomTo(viewer.camera.zoom * 1.2); shelf.updateZoom(); saveCameraState() },
    onZoomOut: () => { viewer.zoomTo(viewer.camera.zoom / 1.2); shelf.updateZoom(); saveCameraState() },
    onZoomReset: () => { viewer.resetView(); shelf.updateZoom(); saveCameraState() },
    getZoom: () => viewer.camera.zoom,
    onOffscreenLabelsToggle: (enabled) => {
      viewer.showOffscreenLabels = enabled
      localStorage.setItem(LABELS_KEY, JSON.stringify(enabled))
    },
    getOffscreenLabels: () => viewer.showOffscreenLabels,
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
  const labelsStored = localStorage.getItem(LABELS_KEY)
  if (labelsStored !== null) {
    viewer.showOffscreenLabels = JSON.parse(labelsStored)
  }
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

  // Restore saved state or fall back to demo
  const saved = loadSavedState()
  if (saved?.diagram) {
    loadContent({ content: saved.diagram, name: saved.name ?? 'untitled' }, false)
    shelf.setFileName(saved.name ?? null)
    if (saved.camera) {
      viewer.zoomTo(saved.camera.zoom)
      viewer.panTo(saved.camera.x, saved.camera.y)
      shelf.updateZoom()
    }
  } else {
    loadContent({ content: DEMO_DIAGRAM, name: 'demo' })
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
      saveState({ diagram: content, camera: { x: 0, y: 0, zoom: 1 } })
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
        saveState({ diagram: text, name: 'paste', camera: { x: 0, y: 0, zoom: 1 } })
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

function saveCameraState() {
  const cam = viewer.camera
  saveState({ camera: { x: cam.x, y: cam.y, zoom: cam.zoom } })
}

function loadContent(result: FileLoadResult, persist = true) {
  const text = maybeExtractMermaid(result.content, result.name)
  viewer.load(text)
  if (persist) {
    saveState({ diagram: result.content, name: result.name, camera: { x: 0, y: 0, zoom: 1 } })
  }
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
