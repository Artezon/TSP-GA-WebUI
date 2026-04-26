<template>
  <div class="canvas-wrap">
    <canvas ref="canvasEl" class="canvas" @mousedown="onMousedown" @wheel.prevent="onWheel" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  draw,
  getColors,
  getFonts,
  NODE_RADIUS,
  EDGE_HIT_THRESHOLD,
  type SelectionBox,
} from '../renderer/canvasRenderer'
import { vx, vy, zoom, toWorld, applyZoom } from '../state/viewport'
import {
  createGraph,
  addVertex,
  removeVertex,
  addEdge,
  removeEdge,
  getVertexAt,
  findEdgeAt,
  clearGraph,
  getDistance,
  setWeight,
  type Vertex,
  type Edge,
  setPos,
} from '../state/graph'
import { emptySelection, type Mode, type Selection } from '../state/ui'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const graph = createGraph()
const selection = emptySelection()
const mode = ref<Mode>('select')

// Mouse tracking
let isMouseDown = false
let mouseX = 0
let mouseY = 0
let mouseDownX = 0
let mouseDownY = 0

// Panning
let isPanning = false
let panStartX = 0
let panStartY = 0
let panStartVX = 0
let panStartVY = 0

// Dragging
type DragState =
  | { kind: 'none' }
  | { kind: 'selectBox'; startX: number; startY: number; keepSelected: Selection | null }
  | {
      kind: 'vertices'
      origins: Map<Vertex, { x: number; y: number }>
      startX: number
      startY: number
    }
  | { kind: 'edge' } // selected but not movable

let drag: DragState = { kind: 'none' }

// Adding new edge
let pendingEdgeFrom: Vertex | null = null
let pendingEdgeToX = 0
let pendingEdgeToY = 0

// Selecting
let selectionBox: SelectionBox | null = null

const EDGE_PAN_MARGIN = 20
const AUTO_PAN_SPEED = 0.15
const MOVE_CANCEL_THRESHOLD = 3

let autoPanRafId: number | null = null

function redraw() {
  const canvas = canvasEl.value
  if (!canvas) return
  draw(
    canvas,
    vx.value,
    vy.value,
    zoom.value,
    graph,
    selection,
    pendingEdgeFrom ?? undefined,
    pendingEdgeToX,
    pendingEdgeToY,
    selectionBox ?? undefined,
  )
}

function updateAutoPan() {
  autoPanRafId = null
  const canvas = canvasEl.value
  if (!canvas || (!isMouseDown && pendingEdgeFrom === null) || isPanning) return
  const rect = canvas.getBoundingClientRect()

  const clampedX = Math.max(rect.left, Math.min(rect.right, mouseX))
  const clampedY = Math.max(rect.top, Math.min(rect.bottom, mouseY))

  let dx = 0
  let dy = 0

  if (clampedX - rect.left < EDGE_PAN_MARGIN)
    dx = -(EDGE_PAN_MARGIN - (clampedX - rect.left)) * AUTO_PAN_SPEED
  else if (rect.right - clampedX < EDGE_PAN_MARGIN)
    dx = (EDGE_PAN_MARGIN - (rect.right - clampedX)) * AUTO_PAN_SPEED

  if (clampedY - rect.top < EDGE_PAN_MARGIN)
    dy = -(EDGE_PAN_MARGIN - (clampedY - rect.top)) * AUTO_PAN_SPEED
  else if (rect.bottom - clampedY < EDGE_PAN_MARGIN)
    dy = (EDGE_PAN_MARGIN - (rect.bottom - clampedY)) * AUTO_PAN_SPEED

  if (dx !== 0 || dy !== 0) {
    vx.value -= dx / zoom.value
    vy.value -= dy / zoom.value
    onMouseOrViewportChanged()
    autoPanRafId = requestAnimationFrame(updateAutoPan)
  }
}

function getBoxFromPoints(x1: number, y1: number, x2: number, y2: number): SelectionBox {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

function isInBox(x: number, y: number, box: SelectionBox): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
}

function selectInBox(box: SelectionBox) {
  for (const v of graph.vertices) {
    if (isInBox(v.x, v.y, box)) selection.vertices.add(v)
  }
  for (const e of graph.edges) {
    if (isInBox((e.v1.x + e.v2.x) / 2, (e.v1.y + e.v2.y) / 2, box)) selection.edges.add(e)
  }
}

function clearSelection() {
  selection.vertices.clear()
  selection.edges.clear()
}

function updateEdgeWeights(vertices: Iterable<Vertex>) {
  const seen = new Set<Edge>()
  for (const v of vertices) {
    for (const edge of graph.adjacency.get(v) ?? []) {
      if (!seen.has(edge)) {
        setWeight(edge, getDistance(edge.v1, edge.v2))
        seen.add(edge)
      }
    }
  }
}

// function updateAllEdgeWeights() {
//   for (const e of graph.edges) {
//     setWeight(e, getDistance(e.v1, e.v2))
//   }
// }

function cancelPendingEdge() {
  pendingEdgeFrom = null
  redraw()
}

// External functions

function setMode(m: Mode) {
  mode.value = m
  cancelPendingEdge()
}

function clearGraphPublic() {
  clearGraph(graph)
  clearSelection()
  redraw()
}

defineExpose({ setMode, clearGraph: clearGraphPublic })

// Mouse handlers

function onMousedown(e: MouseEvent) {
  isMouseDown = true
  mouseX = e.clientX
  mouseY = e.clientY
  mouseDownX = e.clientX
  mouseDownY = e.clientY

  // Middle-click always pans
  if (e.button === 1 || mode.value === 'move') {
    isPanning = true
    panStartX = e.clientX
    panStartY = e.clientY
    panStartVX = vx.value
    panStartVY = vy.value
    return
  }

  if (e.button !== 0) return

  const canvas = canvasEl.value!
  const w = toWorld(e.clientX, e.clientY, canvas)
  const hitVertex = getVertexAt(graph, w.x, w.y, NODE_RADIUS / zoom.value)
  const hitEdge = hitVertex ? null : findEdgeAt(graph, w.x, w.y, EDGE_HIT_THRESHOLD / zoom.value)

  if (mode.value === 'select') {
    if (hitVertex) {
      const alreadySelected = selection.vertices.has(hitVertex)
      if (!e.ctrlKey && !alreadySelected) clearSelection()
      selection.vertices.add(hitVertex)

      const origins = new Map<Vertex, { x: number; y: number }>()
      for (const v of selection.vertices) origins.set(v, { x: v.x, y: v.y })
      drag = { kind: 'vertices', origins, startX: w.x, startY: w.y }
    } else if (hitEdge) {
      if (!e.ctrlKey) clearSelection()
      selection.edges.add(hitEdge)
      drag = { kind: 'edge' }
    } else {
      if (!e.ctrlKey) clearSelection()
      const keepSelected = e.ctrlKey
        ? { vertices: new Set(selection.vertices), edges: new Set(selection.edges) }
        : null
      drag = { kind: 'selectBox', startX: w.x, startY: w.y, keepSelected }
      selectionBox = { x: w.x, y: w.y, width: 0, height: 0 }
    }
    redraw()
    return
  }

  if (mode.value === 'add') {
    if (pendingEdgeFrom !== null) {
      if (hitVertex && hitVertex !== pendingEdgeFrom) {
        addEdge(graph, pendingEdgeFrom, hitVertex)
      }
      cancelPendingEdge()
      return
    }

    if (hitVertex) {
      pendingEdgeFrom = hitVertex
      pendingEdgeToX = w.x
      pendingEdgeToY = w.y
    } else {
      addVertex(graph, w.x, w.y)
      redraw()
    }
    return
  }
}

function onMousemove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY

  if (isPanning) {
    vx.value = panStartVX + (e.clientX - panStartX) / zoom.value
    vy.value = panStartVY + (e.clientY - panStartY) / zoom.value
    redraw()
    return
  }

  if (drag.kind !== 'none' || pendingEdgeFrom !== null) {
    if (autoPanRafId === null) autoPanRafId = requestAnimationFrame(updateAutoPan)
    onMouseOrViewportChanged()
  }
}

function onMouseOrViewportChanged() {
  const canvas = canvasEl.value!

  if (drag.kind === 'selectBox') {
    const w = toWorld(mouseX, mouseY, canvas)
    selectionBox = getBoxFromPoints(drag.startX, drag.startY, w.x, w.y)
    clearSelection()
    if (drag.keepSelected) {
      drag.keepSelected.vertices.forEach((v) => selection.vertices.add(v))
      drag.keepSelected.edges.forEach((e) => selection.edges.add(e))
    }
    selectInBox(selectionBox)
  } else if (drag.kind === 'vertices') {
    const w = toWorld(mouseX, mouseY, canvas)
    const dx = w.x - drag.startX
    const dy = w.y - drag.startY
    for (const [v, origin] of drag.origins) {
      setPos(v, origin.x + dx, origin.y + dy)
    }
    updateEdgeWeights(drag.origins.keys())
  }

  if (pendingEdgeFrom !== null) {
    const rect = canvas.getBoundingClientRect()
    const clampedX = Math.max(rect.left, Math.min(rect.right, mouseX))
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, mouseY))
    const w = toWorld(clampedX, clampedY, canvas)
    pendingEdgeToX = w.x
    pendingEdgeToY = w.y
  }

  redraw()
}

function onMouseup(e: MouseEvent) {
  if (!isMouseDown) return
  isMouseDown = false

  const moved = Math.hypot(mouseX - mouseDownX, mouseY - mouseDownY) > MOVE_CANCEL_THRESHOLD

  if (isPanning) {
    isPanning = false
    return
  }

  if (mode.value === 'select') {
    if (drag.kind === 'selectBox') {
      if (selectionBox && selectionBox.width <= 5 && selectionBox.height <= 5) {
        clearSelection()
      }
      selectionBox = null
    } else if (drag.kind === 'vertices') {
      updateEdgeWeights(drag.origins.keys())
    }
    drag = { kind: 'none' }
    redraw()
    return
  }

  if (mode.value === 'remove') {
    if (!moved) {
      const canvas = canvasEl.value!
      const w = toWorld(e.clientX, e.clientY, canvas)
      const hitVertex = getVertexAt(graph, w.x, w.y, NODE_RADIUS / zoom.value)
      const hitEdge = hitVertex
        ? null
        : findEdgeAt(graph, w.x, w.y, EDGE_HIT_THRESHOLD / zoom.value)

      // If the vertex or edge is part of a selection, delete the whole selection
      if (
        (hitVertex && selection.vertices.has(hitVertex)) ||
        (hitEdge && selection.edges.has(hitEdge))
      ) {
        for (const v of selection.vertices) removeVertex(graph, v)
        for (const e of selection.edges) removeEdge(graph, e)
        clearSelection()
      } else {
        if (hitVertex) removeVertex(graph, hitVertex)
        if (hitEdge) removeEdge(graph, hitEdge)
      }
    }
    redraw()
  }
}

function onWheel(e: WheelEvent) {
  applyZoom(e.clientX, e.clientY, canvasEl.value!, e.deltaY)
  redraw()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Delete') {
    for (const v of selection.vertices) removeVertex(graph, v)
    for (const edge of selection.edges) removeEdge(graph, edge)
    clearSelection()
    redraw()
    return
  }
  if (e.key === 'Escape') {
    cancelPendingEdge()
  }
}

function resizeCanvas() {
  const canvas = canvasEl.value!
  const d = window.devicePixelRatio || 1
  canvas.width = canvas.offsetWidth * d
  canvas.height = canvas.offsetHeight * d
  redraw()
}

onMounted(() => {
  getColors()
  getFonts()
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mouseup', onMouseup)
  window.addEventListener('mousemove', onMousemove)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mouseup', onMouseup)
  window.removeEventListener('mousemove', onMousemove)
})
</script>

<style scoped>
.canvas-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
