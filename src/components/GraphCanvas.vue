<template>
  <div class="canvas-wrap">
    <canvas ref="canvasEl" class="canvas" @mousedown="onMousedown" @wheel.prevent="onWheel" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { draw, getColors, getFonts } from '../renderer/canvasRenderer'
import { vx, vy, zoom, applyZoom } from '../state/viewport'
import { createGraph, clearGraph as clearGraphState, type Graph } from '../state/graph'
import { emptySelection } from '../state/ui'

const props = defineProps<{
  error?: boolean
  showVertexNames?: boolean
  showEdgeWeights?: boolean
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const graph = ref<Graph>(createGraph())
const selection = emptySelection()

function redraw() {
  const canvas = canvasEl.value
  if (!canvas) return
  draw(canvas, vx.value, vy.value, zoom.value, graph.value, selection, {
    showVertexNames: props.showVertexNames,
    showEdgeWeights: props.showEdgeWeights !== false,
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

defineExpose({ clearGraph, setGraph })

watch(
  () => props.error,
  (err) => {
    if (err) clearGraph()
  },
)

watch(
  () => [props.showVertexNames, props.showEdgeWeights],
  () => redraw(),
)

let isPanning = false
let panStartX = 0
let panStartY = 0
let panStartVX = 0
let panStartVY = 0

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
  applyZoom(e.clientX, e.clientY, canvasEl.value!, e.deltaY)
  redraw()
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
  window.addEventListener('mouseup', onMouseup)
  window.addEventListener('mousemove', onMousemove)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
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
