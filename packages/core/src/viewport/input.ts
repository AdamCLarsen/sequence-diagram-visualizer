import type { Camera } from './camera'
import { panCamera, zoomCamera, clampCamera } from './camera'

export interface InputHandlerOptions {
  getCamera: () => Camera
  setCamera: (camera: Camera) => void
  getDiagramSize: () => { width: number; height: number }
  getCanvasSize: () => { width: number; height: number }
  requestRender: () => void
  onClick?: (screenX: number, screenY: number) => void
  hitTest?: (screenX: number, screenY: number) => boolean
}

export function attachInputHandlers(
  canvas: HTMLCanvasElement,
  options: InputHandlerOptions,
): () => void {
  let isDragging = false
  let lastX = 0
  let lastY = 0
  let startX = 0
  let startY = 0
  const CLICK_THRESHOLD = 5

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()

    const camera = options.getCamera()
    const diagram = options.getDiagramSize()
    const viewport = options.getCanvasSize()
    let newCamera: Camera

    if (e.shiftKey) {
      // Shift+scroll: horizontal pan
      newCamera = panCamera(camera, e.deltaY / camera.zoom, 0)
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+scroll: vertical pan
      newCamera = panCamera(camera, 0, e.deltaY / camera.zoom)
    } else {
      // Plain scroll: zoom around cursor
      const rect = canvas.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      newCamera = zoomCamera(camera, e.deltaY, cursorX, cursorY)
    }

    newCamera = clampCamera(newCamera, diagram.width, diagram.height, viewport.width, viewport.height)
    options.setCamera(newCamera)
    options.requestRender()
  }

  const onMouseDown = (e: MouseEvent) => {
    isDragging = true
    lastX = e.clientX
    lastY = e.clientY
    startX = e.clientX
    startY = e.clientY
    canvas.style.cursor = 'grabbing'
  }

  function updateCursor(e: MouseEvent): void {
    if (options.hitTest) {
      const rect = canvas.getBoundingClientRect()
      const isOver = options.hitTest(e.clientX - rect.left, e.clientY - rect.top)
      canvas.style.cursor = isOver ? 'pointer' : 'grab'
    } else {
      canvas.style.cursor = 'grab'
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) {
      updateCursor(e)
      return
    }

    const dx = -(e.clientX - lastX) / options.getCamera().zoom
    const dy = -(e.clientY - lastY) / options.getCamera().zoom
    lastX = e.clientX
    lastY = e.clientY

    const camera = options.getCamera()
    const diagram = options.getDiagramSize()
    const viewport = options.getCanvasSize()
    let newCamera = panCamera(camera, dx, dy)
    newCamera = clampCamera(newCamera, diagram.width, diagram.height, viewport.width, viewport.height)
    options.setCamera(newCamera)
    options.requestRender()
  }

  const onMouseUp = (e: MouseEvent) => {
    const dx = Math.abs(e.clientX - startX)
    const dy = Math.abs(e.clientY - startY)
    if (isDragging && dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD) {
      const rect = canvas.getBoundingClientRect()
      options.onClick?.(e.clientX - rect.left, e.clientY - rect.top)
    }
    isDragging = false
    updateCursor(e)
  }

  canvas.style.cursor = 'grab'
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  return () => {
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}
