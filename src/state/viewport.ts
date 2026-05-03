import { ref } from 'vue'

const ZOOM_IN = 1.1
const ZOOM_OUT = 1 / ZOOM_IN

export const vx = ref(0)
export const vy = ref(0)
export const zoom = ref(0.5)

export function initializeViewport(width: number, height: number) {
  vx.value = width / 2 / zoom.value
  vy.value = height / 2 / zoom.value
}

// Convert screen coordinates to world coordinates
export function toWorld(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (clientX - rect.left) / zoom.value - vx.value,
    y: (clientY - rect.top) / zoom.value - vy.value,
  }
}

// Convert world coordinates to canvas coordinates
export function toCanvas(worldX: number, worldY: number) {
  return {
    x: (worldX + vx.value) * zoom.value,
    y: (worldY + vy.value) * zoom.value,
  }
}

// Zoom in or out toward a specific screen point
export function applyZoom(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  scrollDelta: number,
) {
  const factor = scrollDelta < 0 ? ZOOM_IN : ZOOM_OUT
  const rect = canvas.getBoundingClientRect()
  const cx = clientX - rect.left
  const cy = clientY - rect.top
  const wx = cx / zoom.value - vx.value
  const wy = cy / zoom.value - vy.value
  zoom.value = Math.max(0.05, Math.min(10, zoom.value * factor))
  vx.value = cx / zoom.value - wx
  vy.value = cy / zoom.value - wy
}
