<script setup lang="ts">
import { ref } from 'vue'
import { generateRandomGraph, type GenerateOptions } from '../utils/randomGraph'
import Modal from './BaseModal.vue'
import Toggle from './ToggleSwitch.vue'

const emit = defineEmits<{
  loadGraph: []
  saveGraph: []
  generate: [text: string]
  clear: []
}>()

const showGenerateModal = ref(false)
const vertexCount = ref(50)
const density = ref(100)
const minEdgeLength = ref(25)
const graphSize = ref(500)

const showVertexNames = defineModel<boolean>('showVertexNames', { default: true })
const showEdgeWeights = defineModel<boolean>('showEdgeWeights', { default: true })
const vertexCountProp = defineModel<number>('vertexCount', { default: 0 })
const edgeCountProp = defineModel<number>('edgeCount', { default: 0 })

function handleGenerate() {
  const options: GenerateOptions = {
    vertexCount: vertexCount.value,
    density: density.value,
    minEdgeLength: minEdgeLength.value,
    graphSize: graphSize.value,
  }
  const text = generateRandomGraph(options)
  emit('generate', text)
  showGenerateModal.value = false
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-btn-row">
      <button @click="emit('loadGraph')">Загрузить</button>
      <button @click="emit('saveGraph')">Сохранить</button>
    </div>
    <div class="sidebar-btn-row">
      <button class="clear-btn" @click="emit('clear')">Очистить</button>
      <button class="lucky-btn" @click="showGenerateModal = true">Мне повезёт!</button>
    </div>

    <div class="edge-list-section">
      <label class="edge-list-label"
        ><p>Список рёбер в формате</p>
        <code>вершина1 вершина2 вес</code>
      </label>
      <slot name="edgeList"></slot>
    </div>

    <div class="graph-stats">
      <span class="stat"
        >Вершин: <strong>{{ vertexCountProp }}</strong></span
      >
      <span class="divider"></span>
      <span class="stat"
        >Рёбер: <strong>{{ edgeCountProp }}</strong></span
      >
    </div>

    <div class="display-toggles">
      <Toggle v-model="showVertexNames">Названия вершин</Toggle>
      <Toggle v-model="showEdgeWeights">Длины рёбер</Toggle>
    </div>
  </aside>

  <Modal v-model="showGenerateModal" title="Сгенерировать случайный граф" width="320px">
    <div class="modal-field">
      <label>Число вершин:</label>
      <input type="number" v-model="vertexCount" min="2" max="100" />
    </div>
    <div class="modal-field">
      <label>Плотность графа: {{ density }}%</label>
      <input type="range" v-model="density" min="0" max="100" />
    </div>
    <div class="modal-field">
      <label>Желательный минимальный вес ребра:</label>
      <input type="number" v-model="minEdgeLength" min="0" :max="graphSize" />
    </div>
    <div class="modal-field">
      <label>Максимальный размер графа:</label>
      <input type="number" v-model="graphSize" min="100" max="10000" step="100" />
    </div>
    <template #footer>
      <button class="cancel-btn" @click="showGenerateModal = false">Отмена</button>
      <button class="primary" @click="handleGenerate">Создать граф</button>
    </template>
  </Modal>
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--header-bg);
  border-right: 1px solid var(--grid-large);
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

.sidebar-btn-row {
  display: flex;
  gap: 8px;
}

button {
  flex: 1;
}

.lucky-btn:hover {
  background-color: var(--green-shade) !important;
}

.clear-btn:hover {
  background-color: var(--red-shade) !important;
}

.edge-list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.edge-list-label {
  margin-bottom: 6px;
  text-align: center;
}

.graph-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--canvas-bg);
  border: 1px solid var(--grid-large);
}

.graph-stats .stat {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
}

.graph-stats .stat strong {
  font-weight: 600;
}

.graph-stats .divider {
  width: 1px;
  height: 100%;
  background: var(--grid-large);
}

.display-toggles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--grid-large);
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-field input[type='number'] {
  padding: 8px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  font-size: 14px;
  background: var(--canvas-bg);
}

.modal-field input[type='range'] {
  width: 100%;
  accent-color: var(--blue-btn);
}

.cancel-btn {
  flex: 0;
}
</style>
