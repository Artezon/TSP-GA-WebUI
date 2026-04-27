<script setup lang="ts">
import { ref } from 'vue'
import { generateRandomGraph, type GenerateOptions } from '../utils/randomGraph'

const emit = defineEmits<{
  loadGraph: []
  saveGraph: []
  generate: [text: string]
  clear: []
}>()

const showGenerateModal = ref(false)
const vertexCount = ref(50)
const density = ref(50)
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
      <button class="primary-btn" @click="emit('loadGraph')">Загрузить</button>
      <button class="primary-btn" @click="emit('saveGraph')">Сохранить</button>
    </div>
    <div class="sidebar-btn-row">
      <button class="primary-btn clear-btn" @click="emit('clear')">Очистить</button>
      <button class="primary-btn lucky-btn" @click="showGenerateModal = true">Мне повезёт!</button>
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
      <label class="toggle-row">
        <input type="checkbox" v-model="showVertexNames" />
        <span>Названия вершин</span>
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="showEdgeWeights" />
        <span>Длины рёбер</span>
      </label>
    </div>
  </aside>

  <Teleport to="body">
    <div v-if="showGenerateModal" class="modal-overlay" @click.self="showGenerateModal = false">
      <div class="modal">
        <h3>Сгенерировать случайный граф</h3>
        <div class="modal-field">
          <label>Число вершин:</label>
          <input type="number" v-model="vertexCount" min="2" max="100" />
        </div>
        <div class="modal-field">
          <label>Плотность графа: {{ density }}%</label>
          <input type="range" v-model="density" min="0" max="100" />
        </div>
        <div class="modal-field">
          <label>Минимальная длина ребра:</label>
          <input type="number" v-model="minEdgeLength" min="0" :max="graphSize" />
        </div>
        <div class="modal-field">
          <label>Размер графа:</label>
          <input type="number" v-model="graphSize" min="100" max="10000" step="100" />
        </div>
        <div class="modal-buttons">
          <button @click="showGenerateModal = false">Отмена</button>
          <button class="primary-btn" @click="handleGenerate">Создать граф</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
* {
  font-size: 13px;
  color: var(--text);
}

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

.primary-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.primary-btn:hover {
  background: var(--grid);
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

.toggle-row input[type='checkbox'] {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--vertex-selected);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.modal {
  background: var(--header-bg);
  border-radius: 12px;
  padding: 20px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

.modal h3 {
  margin: 0;
  font-size: 16px;
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
}

.modal-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-buttons button {
  padding: 8px 16px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.modal-buttons button:hover {
  background: var(--grid);
}

.modal-buttons .primary-btn {
  background: var(--vertex-selected);
  border-color: var(--vertex-selected);
  color: white;
}

.modal-buttons .primary-btn:hover {
  background: var(--blue-btn);
}

.lucky-btn:hover {
  background-color: var(--green-btn);
}

.clear-btn:hover {
  background-color: var(--red-btn);
}
</style>
