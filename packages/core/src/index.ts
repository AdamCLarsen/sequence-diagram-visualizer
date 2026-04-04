import { parse, extractFromMarkdown } from './parser'
import type { SequenceDiagramAST } from './parser/types'
import { layout } from './layout'
import type { LayoutModel, TextMeasurer } from './layout/types'
import { DEFAULT_LAYOUT_CONFIG } from './layout/types'
import { render } from './renderer'
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
}

export interface Viewer {
  load(text: string): void
  zoomTo(level: number): void
  resetView(): void
  resize(): void
  destroy(): void
  readonly camera: Camera
  readonly ast: SequenceDiagramAST | null
  readonly layout: LayoutModel | null
}

export function createViewer(
  canvas: HTMLCanvasElement,
  options: ViewerOptions = {},
): Viewer {
  const ctx = canvas.getContext('2d')!
  const theme = getTheme(options.theme ?? 'light')

  let currentCamera = createCamera()
  let currentAST: SequenceDiagramAST | null = null
  let currentLayout: LayoutModel | null = null
  let rafId: number | null = null

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
    render(ctx, currentLayout, currentAST, currentCamera, canvas.width, canvas.height, theme)
  }

  function updateCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
  }

  const detachInput = attachInputHandlers(canvas, {
    getCamera: () => currentCamera,
    setCamera: (cam) => { currentCamera = cam },
    getDiagramSize: () => currentLayout
      ? { width: currentLayout.width, height: currentLayout.height }
      : { width: 0, height: 0 },
    getCanvasSize: () => ({
      width: canvas.getBoundingClientRect().width,
      height: canvas.getBoundingClientRect().height,
    }),
    requestRender: scheduleRender,
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

    get camera() { return currentCamera },
    get ast() { return currentAST },
    get layout() { return currentLayout },
  }

  return viewer
}
