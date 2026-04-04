import { createViewer, extractFromMarkdown, type Viewer } from '@seq-viz/core'
import { openFile, reloadFile, readDroppedFile, type FileLoadResult } from './file-loader'
import { createPasteInput, type PasteInput } from './paste-input'
import { createShelf } from './shelf'

let viewer: Viewer
let currentHandle: FileSystemFileHandle | null = null
let pasteInput: PasteInput | null = null

function init() {
  const canvas = document.getElementById('diagram-canvas') as HTMLCanvasElement
  if (!canvas) throw new Error('Canvas element not found')

  const pasteContainer = document.getElementById('paste-container') as HTMLElement

  viewer = createViewer(canvas, {
    theme: 'light',
    onError: (err) => console.error('[seq-viz]', err),
  })

  const shelf = createShelf({
    onOpen: handleOpen,
    onReload: handleReload,
    onPasteToggle: (active) => handlePasteToggle(active, pasteContainer),
    onZoomIn: () => { viewer.zoomTo(viewer.camera.zoom * 1.2); shelf.updateZoom() },
    onZoomOut: () => { viewer.zoomTo(viewer.camera.zoom / 1.2); shelf.updateZoom() },
    onZoomReset: () => { viewer.resetView(); shelf.updateZoom() },
    getZoom: () => viewer.camera.zoom,
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

  // Load demo on start if no stored paste
  const stored = localStorage.getItem('seq-viz-paste')
  if (!stored) {
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
