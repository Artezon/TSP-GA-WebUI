<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import GraphCanvas from './components/GraphCanvas.vue'
import type { Mode } from './state/ui'

const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
const activeMode = ref<Mode>('select')

function setMode(m: Mode) {
  activeMode.value = m
  canvasRef.value?.setMode(m)
}

function clearAll() {
  canvasRef.value?.clearGraph()
}
</script>

<template>
  <AppHeader :activeMode="activeMode" @setMode="setMode" @clearAll="clearAll" />
  <GraphCanvas ref="canvasRef" />
</template>
