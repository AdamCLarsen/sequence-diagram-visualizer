export interface Camera {
  x: number
  y: number
  zoom: number
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4.0

export function createCamera(): Camera {
  return { x: 0, y: 0, zoom: 1.0 }
}

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return {
    ...camera,
    x: camera.x + dx,
    y: camera.y + dy,
  }
}

export function zoomCamera(
  camera: Camera,
  delta: number,
  cursorX: number,
  cursorY: number,
): Camera {
  const oldZoom = camera.zoom
  const newZoom = clampZoom(oldZoom * (1 - delta * 0.001))

  // Zoom around cursor: adjust camera so the world point under cursor stays fixed
  const worldX = camera.x + cursorX / oldZoom
  const worldY = camera.y + cursorY / oldZoom
  const newCamX = worldX - cursorX / newZoom
  const newCamY = worldY - cursorY / newZoom

  return {
    x: newCamX,
    y: newCamY,
    zoom: newZoom,
  }
}

export function resetCamera(): Camera {
  return createCamera()
}

export function clampCamera(
  camera: Camera,
  diagramWidth: number,
  diagramHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): Camera {
  const vw = viewportWidth / camera.zoom
  const vh = viewportHeight / camera.zoom

  // When zoomed in (diagram > viewport): pan within [0, diagram - viewport]
  // When zoomed out (diagram < viewport): allow [diagram - viewport, 0] so
  // zoom-to-cursor can offset the diagram naturally within the viewport
  const minX = Math.min(0, diagramWidth - vw)
  const maxX = Math.max(0, diagramWidth - vw)
  const minY = Math.min(0, diagramHeight - vh)
  const maxY = Math.max(0, diagramHeight - vh)

  return {
    ...camera,
    x: Math.max(minX, Math.min(maxX, camera.x)),
    y: Math.max(minY, Math.min(maxY, camera.y)),
  }
}
