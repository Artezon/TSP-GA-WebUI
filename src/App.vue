<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import GraphCanvas from './components/GraphCanvas.vue'
import AppSidebar from './components/AppSidebar.vue'
import TspSidebar from './components/TspSidebar.vue'
import BaseModal from './components/BaseModal.vue'
import { type Vertex, createGraph, addVertex, addEdge, setPos, setWeight } from './state/graph'
import { emptySelection } from './state/ui'
import { computeForceDirectedLayout } from './utils/layout'
import { loadGraphFromFile, saveGraphToFile, type SerializableGraph } from './utils/graphFile'
import { terminateWorker } from './tsp/runner'
import { parseEdgeList } from './utils/edgeList'

const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
const currentGraph = ref<ReturnType<typeof createGraph> | null>(null)

const edgeListText = ref('')
const errorMsg = ref<string | null>(null)
const modalMsg = ref<string | null>(null)
const loadedVertexDataOverride = ref<SerializableGraph['vertices'] | null>(null)
const showVertexNames = ref(true)
const showEdgeWeights = ref(true)
const showOnlySelectedEdges = ref(false)

const vertexCount = computed(() => currentGraph.value?.vertices?.size ?? 0)
const edgeCount = computed(() => currentGraph.value?.edges?.size ?? 0)

const serializableGraph = computed<SerializableGraph | null>(() => {
  try {
    return parseEdgeList(edgeListText.value)
  } catch {
    return null
  }
})

function loadGraph() {
  loadGraphFromFile(
    (vertices, edgeText) => {
      loadedVertexDataOverride.value = vertices
      edgeListText.value = edgeText
    },
    (message) => {
      modalMsg.value = message
    },
  )
}

function saveGraph() {
  if (currentGraph.value) saveGraphToFile(currentGraph.value)
  else modalMsg.value = 'Невозможно сохранить пустой граф.'
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
    errorMsg.value = null
    const data = parseEdgeList(edgeListText.value)
    if (data) {
      applyGraphToCanvas()
    } else {
      canvasRef.value?.clearGraph()
      currentGraph.value = null
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Неверный формат графа'
    canvasRef.value?.clearGraph()
  }
})

function handleTourSelected(vertexNames: string[]) {
  if (!currentGraph.value || vertexNames.length === 0) {
    canvasRef.value?.setSelection(emptySelection())
    return
  }

  const sel = emptySelection()
  const vertexMap = new Map(Array.from(currentGraph.value.vertices).map((v) => [v.name, v]))

  for (const name of vertexNames) {
    const v = vertexMap.get(name)
    if (v) sel.vertices.add(v)
  }

  for (let i = 0; i < vertexNames.length - 1; i++) {
    const a = vertexMap.get(vertexNames[i]!)
    const b = vertexMap.get(vertexNames[i + 1]!)
    if (!a || !b) continue
    for (const e of currentGraph.value.adjacency.get(a) ?? []) {
      if (e.v1 === b || e.v2 === b) {
        sel.edges.add(e)
        break
      }
    }
  }

  canvasRef.value?.setSelection(sel)
}

onBeforeUnmount(() => {
  terminateWorker()
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
      v-model:showOnlySelectedEdges="showOnlySelectedEdges"
      :vertexCount="vertexCount"
      :edgeCount="edgeCount"
    >
      <template #edgeList>
        <textarea v-model="edgeListText" class="edge-list-input"></textarea>
      </template>
    </AppSidebar>

    <main class="main-content">
      <div v-if="errorMsg" class="error-overlay">
        <div class="error-box">{{ errorMsg }}</div>
      </div>
      <GraphCanvas
        ref="canvasRef"
        :error="!!errorMsg"
        :showVertexNames="showVertexNames"
        :showEdgeWeights="showEdgeWeights"
        :showOnlySelectedEdges="showOnlySelectedEdges"
      />
    </main>

    <TspSidebar
      :graph="currentGraph"
      :vertexCount="vertexCount"
      @tourSelected="handleTourSelected"
    />
  </div>

  <BaseModal :modelValue="modalMsg != null" @update:modelValue="modalMsg = null" title="Ошибка">
    <p style="white-space: pre-wrap">{{ modalMsg }}</p>
    <template #footer>
      <button @click="modalMsg = null">OK</button>
    </template>
  </BaseModal>
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
