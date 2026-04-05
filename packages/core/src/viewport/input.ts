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

  // --- Touch support ---
  let activeTouches: Touch[] = []
  let touchStartTime = 0
  let touchStartX = 0
  let touchStartY = 0
  let lastPinchDist = 0
  let lastPinchCenterX = 0
  let lastPinchCenterY = 0
  const TAP_THRESHOLD = 10
  const TAP_MAX_DURATION = 300

  function getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    activeTouches = Array.from(e.touches)

    if (e.touches.length === 1) {
      const t = e.touches[0]
      touchStartTime = Date.now()
      touchStartX = t.clientX
      touchStartY = t.clientY
      lastX = t.clientX
      lastY = t.clientY
      isDragging = true
    } else if (e.touches.length === 2) {
      isDragging = false
      const t0 = e.touches[0]
      const t1 = e.touches[1]
      lastPinchDist = getTouchDistance(t0, t1)
      lastPinchCenterX = (t0.clientX + t1.clientX) / 2
      lastPinchCenterY = (t0.clientY + t1.clientY) / 2
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    activeTouches = Array.from(e.touches)

    if (e.touches.length === 1 && isDragging) {
      // Single finger pan
      const t = e.touches[0]
      const dx = -(t.clientX - lastX) / options.getCamera().zoom
      const dy = -(t.clientY - lastY) / options.getCamera().zoom
      lastX = t.clientX
      lastY = t.clientY

      const camera = options.getCamera()
      const diagram = options.getDiagramSize()
      const viewport = options.getCanvasSize()
      let newCamera = panCamera(camera, dx, dy)
      newCamera = clampCamera(newCamera, diagram.width, diagram.height, viewport.width, viewport.height)
      options.setCamera(newCamera)
      options.requestRender()
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0]
      const t1 = e.touches[1]
      const dist = getTouchDistance(t0, t1)
      const centerX = (t0.clientX + t1.clientX) / 2
      const centerY = (t0.clientY + t1.clientY) / 2

      // Pinch zoom
      if (lastPinchDist > 0) {
        const scale = dist / lastPinchDist
        const rect = canvas.getBoundingClientRect()
        const cursorX = centerX - rect.left
        const cursorY = centerY - rect.top

        // Convert scale ratio to a delta that zoomCamera expects
        // zoomCamera uses negative delta to zoom in, positive to zoom out
        const delta = -(scale - 1) * 200

        const camera = options.getCamera()
        const diagram = options.getDiagramSize()
        const viewport = options.getCanvasSize()
        let newCamera = zoomCamera(camera, delta, cursorX, cursorY)

        // Also pan with the pinch center movement
        const panDx = -(centerX - lastPinchCenterX) / camera.zoom
        const panDy = -(centerY - lastPinchCenterY) / camera.zoom
        newCamera = panCamera(newCamera, panDx, panDy)

        newCamera = clampCamera(newCamera, diagram.width, diagram.height, viewport.width, viewport.height)
        options.setCamera(newCamera)
        options.requestRender()
      }

      lastPinchDist = dist
      lastPinchCenterX = centerX
      lastPinchCenterY = centerY
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    e.preventDefault()

    // Detect tap (short, small movement, single finger)
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      const t = e.changedTouches[0]
      const dx = Math.abs(t.clientX - touchStartX)
      const dy = Math.abs(t.clientY - touchStartY)
      const duration = Date.now() - touchStartTime

      if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD && duration < TAP_MAX_DURATION) {
        const rect = canvas.getBoundingClientRect()
        options.onClick?.(t.clientX - rect.left, t.clientY - rect.top)
      }
    }

    isDragging = false
    activeTouches = Array.from(e.touches)
    lastPinchDist = 0
  }

  canvas.style.cursor = 'grab'
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false })

  return () => {
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    canvas.removeEventListener('touchcancel', onTouchEnd)
  }
}
