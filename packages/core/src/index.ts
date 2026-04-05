import { parse, extractFromMarkdown } from './parser'
import type { SequenceDiagramAST } from './parser/types'
import { layout } from './layout'
import type { LayoutModel, TextMeasurer } from './layout/types'
import { DEFAULT_LAYOUT_CONFIG } from './layout/types'
import { render, type RenderOptions } from './renderer'
import { getTheme, type Theme } from './renderer/theme'
import { createCamera, resetCamera, clampZoom, type Camera } from './viewport/camera'
import { attachInputHandlers } from './viewport/input'

export { parse, extractFromMarkdown }
export { layout, DEFAULT_LAYOUT_CONFIG }
export { render }
export { getTheme }
export type { SequenceDiagramAST, LayoutModel, TextMeasurer, Theme, Camera }

export interface ViewerOptions {
  theme?: 'light' | 'dark'
  onError?: (err: Error) => void
  onCameraChange?: (camera: Camera) => void
  onSelectionChange?: (selectedIds: string[]) => void
}

export interface Viewer {
  load(text: string): void
  zoomTo(level: number): void
  panTo(x: number, y: number): void
  resetView(): void
  resize(): void
  destroy(): void
  setTheme(name: 'light' | 'dark'): void
  toggleParticipant(id: string): void
  clearSelection(): void
  showOffscreenLabels: boolean
  showSourceLabels: boolean
  showDiagramColors: boolean
  readonly selectedParticipantIds: string[]
  readonly themeName: 'light' | 'dark'
  readonly camera: Camera
  readonly ast: SequenceDiagramAST | null
  readonly layout: LayoutModel | null
}

export function createViewer(
  canvas: HTMLCanvasElement,
  options: ViewerOptions = {},
): Viewer {
  const ctx = canvas.getContext('2d')!
  let currentThemeName: 'light' | 'dark' = options.theme ?? 'light'
  let theme = getTheme(currentThemeName)

  let currentCamera = createCamera()
  let currentAST: SequenceDiagramAST | null = null
  let currentLayout: LayoutModel | null = null
  let rafId: number | null = null
  let offscreenLabels = true
  let sourceLabels = false
  let diagramColors = true
  const selectedParticipants = new Set<string>()

  const measurer: TextMeasurer = {
    measure(text: string, font: string): number {
      ctx.font = font
      return ctx.measureText(text).width
    },
  }

  function scheduleRender(): void {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      doRender()
    })
  }

  function doRender(): void {
    if (!currentAST || !currentLayout) return
    render(ctx, currentLayout, currentAST, currentCamera, canvas.width, canvas.height, theme, {
      showOffscreenLabels: offscreenLabels,
      showSourceLabels: sourceLabels,
      showDiagramColors: diagramColors,
      selectedParticipants: selectedParticipants.size > 0 ? selectedParticipants : undefined,
    })
  }

  function updateCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
  }

  const BOX_HEIGHT = 36

  /** Returns the participant ID under the screen point, or null */
  function hitTestHeader(screenX: number, screenY: number): string | null {
    if (!currentLayout) return null
    const { zoom, x: camX } = currentCamera
    const diagramX = screenX / zoom + camX
    const diagramY = screenY / zoom
    const headerHeight = currentLayout.headerHeight

    if (diagramY < headerHeight) {
      const boxY = (headerHeight - BOX_HEIGHT) / 2
      if (diagramY >= boxY && diagramY <= boxY + BOX_HEIGHT) {
        for (const col of currentLayout.columns) {
          const boxLeft = col.x - col.width / 2 + 10
          const boxRight = col.x + col.width / 2 - 10
          if (diagramX >= boxLeft && diagramX <= boxRight) {
            return col.participantId
          }
        }
      }
    }
    return null
  }

  function handleCanvasClick(screenX: number, screenY: number): void {
    const id = hitTestHeader(screenX, screenY)
    if (id) {
      if (selectedParticipants.has(id)) {
        selectedParticipants.delete(id)
      } else {
        selectedParticipants.add(id)
      }
      options.onSelectionChange?.([...selectedParticipants])
      scheduleRender()
    }
  }

  const detachInput = attachInputHandlers(canvas, {
    getCamera: () => currentCamera,
    setCamera: (cam) => { currentCamera = cam; options.onCameraChange?.(cam) },
    getDiagramSize: () => currentLayout
      ? { width: currentLayout.width, height: currentLayout.height }
      : { width: 0, height: 0 },
    getCanvasSize: () => ({
      width: canvas.getBoundingClientRect().width,
      height: canvas.getBoundingClientRect().height,
    }),
    requestRender: scheduleRender,
    onClick: handleCanvasClick,
    hitTest: (sx, sy) => hitTestHeader(sx, sy) !== null,
  })

  const resizeObserver = new ResizeObserver(() => {
    updateCanvasSize()
    scheduleRender()
  })
  resizeObserver.observe(canvas)

  const viewer: Viewer = {
    load(text: string): void {
      try {
        currentAST = parse(text)
        currentLayout = layout(currentAST, measurer)
        currentCamera = createCamera()
        selectedParticipants.clear()
        updateCanvasSize()
        doRender()
      } catch (err) {
        options.onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    },

    zoomTo(level: number): void {
      currentCamera = { ...currentCamera, zoom: clampZoom(level) }
      scheduleRender()
    },

    panTo(x: number, y: number): void {
      currentCamera = { ...currentCamera, x, y }
      scheduleRender()
    },

    resetView(): void {
      currentCamera = resetCamera()
      scheduleRender()
    },

    resize(): void {
      updateCanvasSize()
      scheduleRender()
    },

    destroy(): void {
      detachInput()
      resizeObserver.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    },

    get showOffscreenLabels() { return offscreenLabels },
    set showOffscreenLabels(v: boolean) { offscreenLabels = v; scheduleRender() },

    get showSourceLabels() { return sourceLabels },
    set showSourceLabels(v: boolean) { sourceLabels = v; scheduleRender() },

    get showDiagramColors() { return diagramColors },
    set showDiagramColors(v: boolean) { diagramColors = v; scheduleRender() },

    setTheme(name: 'light' | 'dark') {
      currentThemeName = name
      theme = getTheme(name)
      scheduleRender()
    },

    toggleParticipant(id: string) {
      if (selectedParticipants.has(id)) {
        selectedParticipants.delete(id)
      } else {
        selectedParticipants.add(id)
      }
      options.onSelectionChange?.([...selectedParticipants])
      scheduleRender()
    },

    clearSelection() {
      selectedParticipants.clear()
      options.onSelectionChange?.([...selectedParticipants])
      scheduleRender()
    },

    get selectedParticipantIds() { return [...selectedParticipants] },

    get themeName() { return currentThemeName },

    get camera() { return currentCamera },
    get ast() { return currentAST },
    get layout() { return currentLayout },
  }

  return viewer
}
