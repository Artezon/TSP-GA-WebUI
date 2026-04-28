<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import GraphCanvas from './components/GraphCanvas.vue'
import AppSidebar from './components/AppSidebar.vue'
import { type Vertex, createGraph, addVertex, addEdge, setPos, setWeight } from './state/graph'
import { computeForceDirectedLayout } from './utils/layout'

const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
const currentGraph = ref<ReturnType<typeof createGraph> | null>(null)

interface SerializableGraph {
  vertices: { name: string; x: number; y: number }[]
  edges: { v1: string; v2: string; w: number }[]
}

const edgeListText = ref('')
const errorMessage = ref<string | null>(null)
const loadedVertexDataOverride = ref<SerializableGraph['vertices'] | null>(null)
const showVertexNames = ref(true)
const showEdgeWeights = ref(true)

const vertexCount = computed(() => currentGraph.value?.vertices?.size ?? 0)
const edgeCount = computed(() => currentGraph.value?.edges?.size ?? 0)

function parseEdgeList(): SerializableGraph | null {
  if (!edgeListText.value.trim()) return null
  const lines = edgeListText.value.split('\n')
  const edges: { v1: string; v2: string; w: number }[] = []
  const vertices = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    if (!line) continue
    const parts = line.trim().split(/\s+/)
    if (parts.length !== 3) throw new Error(`Неверный формат: "${line}" (строка ${lineNum})`)
    const v1 = parts[0]
    const v2 = parts[1]
    const w = parts[2]
    if (!v1 || !v2 || !w) throw new Error(`Неверный формат: "${line}" (строка ${lineNum})`)
    const weight = parseFloat(w)
    if (isNaN(weight)) throw new Error(`Недопустимое значение веса: "${w}" (строка ${lineNum})`)
    if (v1 === v2) throw new Error(`Петля не допускается: "${v1} ${v2} ${w}" (строка ${lineNum})`)
    edges.push({ v1, v2, w: weight })
    vertices.add(v1)
    vertices.add(v2)
  }

  return {
    vertices: Array.from(vertices).map((name) => ({ name, x: 0, y: 0 })),
    edges,
  }
}

const serializableGraph = computed<SerializableGraph | null>(() => {
  try {
    return parseEdgeList()
  } catch {
    return null
  }
})

function loadGraph() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as SerializableGraph
      if (!data.vertices || !data.edges) throw new Error('Invalid JSON format')
      loadedVertexDataOverride.value = data.vertices
      edgeListText.value = data.edges.map((e) => `${e.v1} ${e.v2} ${e.w}`).join('\n')
    } catch {
      errorMessage.value =
        'Не удалось загрузить граф\nВозможно, файл повреждён или не является файлом графа.'
    }
  }
  input.click()
}

function saveGraph() {
  if (!serializableGraph.value || !currentGraph.value) return
  const data: SerializableGraph = {
    vertices: Array.from(currentGraph.value.vertices).map((v) => ({
      name: v.name,
      x: v.x,
      y: v.y,
    })),
    edges: serializableGraph.value.edges,
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'graph.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleClear() {
  edgeListText.value = ''
  canvasRef.value?.clearGraph()
}

function handleGenerate(text: string) {
  edgeListText.value = text
}

function applyGraphToCanvas() {
  if (!serializableGraph.value) {
    canvasRef.value?.clearGraph()
    return
  }

  const graph = createGraph()
  const vertexMap = new Map<string, Vertex>()

  for (const v of serializableGraph.value.vertices) {
    const vertex = addVertex(graph, 0, 0)
    vertex.name = v.name
    vertexMap.set(v.name, vertex)
  }

  for (const e of serializableGraph.value.edges) {
    const v1 = vertexMap.get(e.v1)
    const v2 = vertexMap.get(e.v2)
    if (v1 && v2) {
      const edge = addEdge(graph, v1, v2)
      if (edge) setWeight(edge, e.w)
    }
  }

  if (loadedVertexDataOverride.value) {
    const posMap = new Map(loadedVertexDataOverride.value.map((v) => [v.name, v]))
    for (const v of graph.vertices) {
      const pos = posMap.get(v.name)
      if (pos) {
        setPos(v, pos.x, pos.y)
      }
    }
    loadedVertexDataOverride.value = null
  } else {
    const positions = computeForceDirectedLayout(graph)
    for (const v of graph.vertices) {
      const pos = positions.get(v)
      if (pos) {
        setPos(v, pos.x * 10, pos.y * 10)
      }
    }
  }

  currentGraph.value = graph
  canvasRef.value?.setGraph(graph)
}

watch(edgeListText, () => {
  try {
    const data = parseEdgeList()
    if (data) {
      errorMessage.value = null
      applyGraphToCanvas()
    } else {
      errorMessage.value = null
      canvasRef.value?.clearGraph()
      currentGraph.value = null
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Invalid graph format'
    canvasRef.value?.clearGraph()
  }
})
</script>

<template>
  <div class="app-container">
    <AppSidebar
      @loadGraph="loadGraph"
      @saveGraph="saveGraph"
      @clear="handleClear"
      @generate="handleGenerate"
      v-model:showVertexNames="showVertexNames"
      v-model:showEdgeWeights="showEdgeWeights"
      :vertexCount="vertexCount"
      :edgeCount="edgeCount"
    >
      <template #edgeList>
        <textarea v-model="edgeListText" class="edge-list-input"></textarea>
      </template>
    </AppSidebar>

    <main class="main-content">
      <div v-if="errorMessage" class="error-overlay">
        <div class="error-box">{{ errorMessage }}</div>
      </div>
      <GraphCanvas
        ref="canvasRef"
        :error="!!errorMessage"
        :showVertexNames="showVertexNames"
        :showEdgeWeights="showEdgeWeights"
      />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.main-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.edge-list-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  padding: 8px;
  font-family: monospace;
  font-size: 12px;
  background: var(--canvas-bg);
  color: var(--text);
}

.edge-list-input:focus {
  outline: none;
  border-color: var(--vertex-selected);
}

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.error-box {
  background: var(--error-box-bg);
  border: 1px solid var(--error-box-content);
  border-radius: 8px;
  padding: 12px 24px;
  color: var(--error-box-content);
  font-size: 14px;
  white-space: pre-wrap;
  line-height: 2;
  text-align: center;
}
</style>
