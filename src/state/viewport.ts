import { ref } from 'vue'

export const vx = ref(0)
export const vy = ref(0)
export const zoom = ref(0.5)

export function initializeViewport(width: number, height: number) {
  vx.value = width / 2 / zoom.value
  vy.value = height / 2 / zoom.value
}

// Convert canvas coordinates to world coordinates
export function canvasToWorld(canvasX: number, canvasY: number) {
  return {
    x: canvasX / zoom.value - vx.value,
    y: canvasY / zoom.value - vy.value,
  }
}

// Convert world coordinates to canvas coordinates
export function worldToCanvas(worldX: number, worldY: number) {
  return {
    x: (worldX + vx.value) * zoom.value,
    y: (worldY + vy.value) * zoom.value,
  }
}

// Zoom in or out toward an anchor point in canvas coordinates
export function setZoom(anchorX: number, anchorY: number, targetZoom: number) {
  const wx = anchorX / zoom.value - vx.value
  const wy = anchorY / zoom.value - vy.value
  zoom.value = Math.max(0.05, Math.min(10, targetZoom))
  vx.value = anchorX / zoom.value - wx
  vy.value = anchorY / zoom.value - wy
}
