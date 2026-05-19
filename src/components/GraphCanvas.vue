<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { draw, getColors, getFonts } from '../renderer/canvasRenderer'
import { vx, vy, zoom, setZoom, initializeViewport } from '../state/viewport'
import { createGraph, clearGraph as clearGraphState, type Graph } from '../state/graph'
import { emptySelection, type Selection } from '../state/ui'

const props = defineProps<{
  error?: boolean
  showVertexNames?: boolean
  showEdgeWeights?: boolean
  showOnlySelectedEdges?: boolean
}>()

const ZOOM_IN = 1.1
const ZOOM_OUT = 1 / ZOOM_IN

const canvasEl = ref<HTMLCanvasElement | null>(null)
const graph = ref<Graph>(createGraph())
let selection = emptySelection()

let lastCanvasW = 0
let lastCanvasH = 0

function redraw() {
  const canvas = canvasEl.value
  if (!canvas) return
  draw(canvas, vx.value, vy.value, zoom.value, graph.value, selection, {
    showVertexNames: props.showVertexNames,
    showEdgeWeights: props.showEdgeWeights,
    showOnlySelectedEdges: props.showOnlySelectedEdges,
  })
}

function clearGraph() {
  clearGraphState(graph.value)
  selection.vertices.clear()
  selection.edges.clear()
  redraw()
}

function setGraph(g: Graph) {
  graph.value = g
  selection.vertices.clear()
  selection.edges.clear()
  redraw()
}

function setSelection(sel: Selection) {
  selection = sel
  redraw()
}

defineExpose({ clearGraph, setGraph, setSelection })

watch(
  () => props.error,
  (err) => {
    if (err) clearGraph()
  },
)

watch(
  () => [props.showVertexNames, props.showEdgeWeights, props.showOnlySelectedEdges],
  () => redraw(),
)

let isPanning = false
let panStartX = 0
let panStartY = 0
let panStartVX = 0
let panStartVY = 0

// For touch gestures
let pinchStartDist = 0
let pinchStartZoom = 1
let isPinching = false

function onMousedown(e: MouseEvent) {
  if (e.button === 0) {
    isPanning = true
    panStartX = e.clientX
    panStartY = e.clientY
    panStartVX = vx.value
    panStartVY = vy.value
  }
}

function onMousemove(e: MouseEvent) {
  if (isPanning) {
    vx.value = panStartVX + (e.clientX - panStartX) / zoom.value
    vy.value = panStartVY + (e.clientY - panStartY) / zoom.value
    redraw()
    return
  }
}

function onMouseup() {
  isPanning = false
}

function onWheel(e: WheelEvent) {
  const rect = canvasEl.value!.getBoundingClientRect()
  setZoom(
    e.clientX - rect.left,
    e.clientY - rect.top,
    zoom.value * (e.deltaY < 0 ? ZOOM_IN : ZOOM_OUT),
  )
  redraw()
}

function touchDist(t1: Touch, t2: Touch) {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchstart(e: TouchEvent) {
  const t0 = e.touches[0]!
  if (e.touches.length === 1) {
    isPanning = true
    isPinching = false
    panStartX = t0.clientX
    panStartY = t0.clientY
    panStartVX = vx.value
    panStartVY = vy.value
  } else if (e.touches.length === 2) {
    isPinching = true
    pinchStartDist = touchDist(t0, e.touches[1]!)
    pinchStartZoom = zoom.value
  }
}

function onTouchmove(e: TouchEvent) {
  const t0 = e.touches[0]!
  if (isPanning && e.touches.length === 1) {
    e.preventDefault()
    vx.value = panStartVX + (t0.clientX - panStartX) / zoom.value
    vy.value = panStartVY + (t0.clientY - panStartY) / zoom.value
    redraw()
  } else if (isPinching && e.touches.length === 2) {
    e.preventDefault()
    const t1 = e.touches[1]!
    const dist = touchDist(t0, t1)
    if (pinchStartDist > 0) {
      const rect = canvasEl.value!.getBoundingClientRect()
      setZoom(
        (t0.clientX + t1.clientX) / 2 - rect.left,
        (t0.clientY + t1.clientY) / 2 - rect.top,
        pinchStartZoom * (dist / pinchStartDist),
      )
      redraw()
    }
  }
}

function onTouchend() {
  isPanning = false
  isPinching = false
}

function resizeCanvas() {
  const canvas = canvasEl.value!
  const d = window.devicePixelRatio || 1

  const newCanvasW = canvas.offsetWidth
  const newCanvasH = canvas.offsetHeight

  if (lastCanvasW && lastCanvasH) {
    const worldCenterX = lastCanvasW / 2 / zoom.value - vx.value
    const worldCenterY = lastCanvasH / 2 / zoom.value - vy.value
    vx.value = newCanvasW / 2 / zoom.value - worldCenterX
    vy.value = newCanvasH / 2 / zoom.value - worldCenterY
  }

  lastCanvasW = newCanvasW
  lastCanvasH = newCanvasH

  canvas.width = newCanvasW * d
  canvas.height = newCanvasH * d

  redraw()
}

onMounted(() => {
  getColors()
  getFonts()
  resizeCanvas()
  const canvas = canvasEl.value!
  initializeViewport(canvas.offsetWidth, canvas.offsetHeight)
  redraw()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('mouseup', onMouseup)
  window.addEventListener('mousemove', onMousemove)
  canvas.addEventListener('touchmove', onTouchmove)
  canvas.addEventListener('touchend', onTouchend)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mouseup', onMouseup)
  window.removeEventListener('mousemove', onMousemove)
  canvasEl.value?.removeEventListener('touchmove', onTouchmove)
  canvasEl.value?.removeEventListener('touchend', onTouchend)
})
</script>

<template>
  <div class="canvas-wrap">
    <canvas
      ref="canvasEl"
      class="canvas"
      @mousedown="onMousedown"
      @wheel.prevent="onWheel"
      @touchstart="onTouchstart"
    />
  </div>
</template>

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
  touch-action: none;
}
</style>
