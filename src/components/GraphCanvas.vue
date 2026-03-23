<template>
  <div class="canvas-wrap">
    <canvas
      ref="canvasEl"
      class="canvas"
      @mousedown="onMousedown"
      @mousemove="onMousemove"
      @mouseup="onMouseup"
      @mouseleave="onMouseup"
      @wheel.prevent="onWheel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getColors, draw } from '../renderer/canvasRenderer'
import { vx, vy, zoom, applyZoom } from '../state/viewport'

const canvasEl = ref<HTMLCanvasElement | null>(null)

// Track pan drag
let isPanning = false
let panStartX = 0,
  panStartY = 0
let panStartVX = 0,
  panStartVY = 0

function redraw() {
  const canvas = canvasEl.value!
  draw(canvas, vx.value, vy.value, zoom.value)
}

function onMousedown(e: MouseEvent) {
  if (e.button !== 0) return
  isPanning = true
  panStartX = e.clientX
  panStartY = e.clientY
  panStartVX = vx.value
  panStartVY = vy.value
}

function onMousemove(e: MouseEvent) {
  if (!isPanning) return
  vx.value = panStartVX + (e.clientX - panStartX) / zoom.value
  vy.value = panStartVY + (e.clientY - panStartY) / zoom.value
  redraw()
}

function onMouseup() {
  isPanning = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  applyZoom(e.clientX, e.clientY, canvasEl.value!, e.deltaY)
  redraw()
}

function resizeCanvas() {
  const canvas = canvasEl.value!
  const d = window.devicePixelRatio || 1
  canvas.width = canvas.offsetWidth * d
  canvas.height = canvas.offsetHeight * d
  const ctx = canvas.getContext('2d')!
  ctx.scale(d, d)
  redraw()
}

onMounted(() => {
  getColors()
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
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
