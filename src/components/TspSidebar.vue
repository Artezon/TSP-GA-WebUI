<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Graph } from '../state/graph'
import type { TspResult, ParamValues, ParamDef } from '../tsp/types'
import { runAlgorithm } from '../tsp/runner'
import { algorithms } from '@/tsp/algorithms'
import TspChart from './TspChart.vue'
import Toggle from './ToggleSwitch.vue'
import BaseModal from './BaseModal.vue'
import { formatTime } from '@/utils/time'
import { downloadCsv } from '@/utils/chartCsv'

const props = defineProps<{
  graph: Graph | null
  vertexCount: number
}>()

const emit = defineEmits<{
  tourSelected: [vertexNames: string[]]
}>()

// Selected algorithm
const selectedAlgoId = ref('genetic-algorithm')
const currentAlgo = computed(() => algorithms.find((a) => a.id === selectedAlgoId.value)!)

// Build default param values reactively when algorithm changes
const paramValues = ref<ParamValues>({})
watch(
  currentAlgo,
  (algo) => {
    const vals: ParamValues = {}
    for (const p of algo.params) {
      vals[p.key] = p.default
    }
    paramValues.value = vals
  },
  { immediate: true },
)

// Animation settings
const animate = ref(false)
const animationDelay = ref(50) // ms between updates

// Run state
const result = ref<TspResult | null>(null)
const isRunning = ref(false)
const errorMsg = ref<string | null>(null)
const iterations = ref(0)
const history = ref<number[]>([])
const averageHistory = ref<number[]>([])
const currentTour = ref<string[]>([])
const currentBestLength = ref(Infinity)
let stopFn: (() => void) | null = null
let intentionalStop = false
const elapsedTime = ref(0) // in milliseconds
let startTime = 0
let timerInterval: ReturnType<typeof setInterval> | null = null

const showFullChartModal = ref(false)

function isParamVisible(p: ParamDef): boolean {
  if (!p.showIf) return true
  return paramValues.value[p.showIf.key] === p.showIf.value
}

function startTimer() {
  startTime = performance.now()
  timerInterval = setInterval(() => {
    elapsedTime.value = Math.floor(performance.now() - startTime)
  }, 100)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (startTime > 0) {
    elapsedTime.value = Math.floor(performance.now() - startTime)
    startTime = 0
  }
}

const canRun = computed(() => {
  if (!props.graph || props.vertexCount < 2) return false
  return true
})

function clear() {
  result.value = null
  iterations.value = 0
  history.value = []
  averageHistory.value = []
  currentTour.value = []
  currentBestLength.value = Infinity
  stopTimer()
  elapsedTime.value = 0
  emit('tourSelected', [])
}

function stop() {
  if (stopFn) {
    stopFn()
    stopFn = null
  }
  intentionalStop = true
  clear()
}

async function run() {
  if (!props.graph || !canRun.value) return
  clear()
  isRunning.value = true
  intentionalStop = false
  startTimer()

  try {
    const onProgress = (intermediate: TspResult) => {
      iterations.value = intermediate.iterations
      // Update history for real-time chart and average history if available
      history.value = intermediate.history
      if (intermediate.averageHistory) {
        averageHistory.value = intermediate.averageHistory
      }
      // Update graph with current best tour if changed
      if (
        currentTour.value.length !== intermediate.bestTour.length ||
        !currentTour.value.every(
          (val: string, index: number) => val === intermediate.bestTour[index],
        )
      ) {
        emit('tourSelected', intermediate.bestTour)
      }
      // Update current best values
      currentTour.value = intermediate.bestTour
      currentBestLength.value = intermediate.bestLength
    }

    const algoHandle = runAlgorithm(
      selectedAlgoId.value,
      props.graph!,
      paramValues.value,
      animate.value,
      animationDelay.value,
      onProgress,
    )

    stopFn = algoHandle.stop
    const res = await algoHandle.promise
    stopFn = null
    result.value = res
    iterations.value = res.iterations
    history.value = res.history
    averageHistory.value = res.averageHistory ?? []
    currentTour.value = res.bestTour
    currentBestLength.value = res.bestLength
    emit('tourSelected', res.bestTour)
  } catch (e) {
    if (!intentionalStop) {
      errorMsg.value = e instanceof Error ? e.message : 'Неизвестная ошибка'
    }
  } finally {
    isRunning.value = false
    intentionalStop = false
    stopFn = null
    stopTimer()
  }
}

// Stop algorithm or clear result when graph changes
watch(
  () => props.graph,
  () => {
    if (isRunning.value) stop()
    else clear()
  },
)
</script>

<template>
  <aside class="tsp-sidebar">
    <div class="sidebar-title">Задача коммивояжёра</div>

    <div class="section" :class="{ disabled: isRunning }">
      <div class="section-title">Алгоритм</div>
      <div class="algo-list">
        <label
          v-for="algo in algorithms"
          :key="algo.id"
          class="algo-option"
          :class="{ active: selectedAlgoId === algo.id }"
        >
          <input type="radio" :value="algo.id" v-model="selectedAlgoId" :disabled="isRunning" />
          {{ algo.label }}
        </label>
      </div>
    </div>

    <div class="section" v-if="currentAlgo.params.length > 0" :class="{ disabled: isRunning }">
      <div class="section-title">Параметры</div>
      <div class="param-list">
        <div
          v-for="p in currentAlgo.params"
          :key="p.key"
          class="param-row"
          v-show="isParamVisible(p)"
        >
          <label class="param-label">
            {{ p.label }}
            <span v-if="p.type === 'range'" class="param-value">{{ paramValues[p.key] }}</span>
          </label>
          <select
            v-if="p.type === 'select'"
            v-model="paramValues[p.key]"
            class="param-input select"
            :disabled="isRunning"
          >
            <option v-for="opt in p.options" :key="opt[0]" :value="opt[0]">
              {{ opt[1] }}
            </option>
          </select>
          <input
            v-else
            :type="p.type"
            v-model.number="paramValues[p.key]"
            :min="p.min"
            :max="p.max"
            :step="p.step ?? 1"
            class="param-input"
            :class="p.type"
            :disabled="isRunning"
          />
        </div>
      </div>
    </div>

    <div class="section" :class="{ disabled: isRunning }">
      <div class="section-title">Анимация</div>
      <div class="param-row">
        <Toggle v-model="animate" :disabled="isRunning">Анимировать</Toggle>
      </div>
      <div v-if="animate" class="param-row">
        <label class="param-label">
          Задержка
          <span class="param-value">{{ animationDelay }} мс</span>
        </label>
        <input
          type="range"
          v-model.number="animationDelay"
          :min="0"
          :max="500"
          :step="10"
          class="param-input range"
          :disabled="isRunning"
        />
      </div>
    </div>

    <div class="section run-section">
      <button
        v-if="!isRunning"
        class="run-btn primary"
        :disabled="!canRun"
        :title="!canRun ? 'Граф не загружен или содержит менее 2 вершин' : undefined"
        @click="run"
      >
        Запустить
      </button>
      <button v-else class="run-btn danger" @click="stop">Стоп</button>
    </div>

    <div class="section result-section">
      <div class="section-title">Результат</div>
      <div class="result-row">
        <span class="result-label">Длина маршрута</span>
        <strong class="result-value">{{
          iterations > 0 ? (currentBestLength === Infinity ? '∞' : currentBestLength) : '–'
        }}</strong>
      </div>
      <div class="result-row">
        <span class="result-label">Итераций (поколений)</span>
        <strong class="result-value">{{ iterations > 0 ? iterations : '–' }}</strong>
      </div>
      <div class="result-row">
        <span class="result-label">Время</span>
        <strong class="result-value">{{
          isRunning || result ? formatTime(elapsedTime) : '–'
        }}</strong>
      </div>
      <div class="result-tour">
        {{
          (result?.bestTour ?? currentTour).length > 0
            ? (result?.bestTour ?? currentTour).join(' → ')
            : 'Здесь будет последовательность посещения вершин'
        }}
      </div>
    </div>

    <div class="section chart-section">
      <div class="section-title">График</div>
      <TspChart
        class="mini-chart"
        :history="history.length > 0 ? history : (result?.history ?? [])"
        :averageHistory="history.length > 0 ? averageHistory : (result?.averageHistory ?? [])"
        type="mini"
        @click="showFullChartModal = true"
      />

      <BaseModal v-model="showFullChartModal" title="График" width="800px">
        <TspChart
          class="full-chart"
          :history="history.length > 0 ? history : (result?.history ?? [])"
          :averageHistory="history.length > 0 ? averageHistory : (result?.averageHistory ?? [])"
          type="full"
        />
        <template #footer>
          <button @click="downloadCsv(history, averageHistory)">Скачать CSV</button>
          <button class="primary" @click="showFullChartModal = false">Закрыть</button>
        </template>
      </BaseModal>
    </div>
  </aside>

  <BaseModal :modelValue="errorMsg != null" @update:modelValue="errorMsg = null" title="Ошибка">
    <p style="white-space: pre-wrap">{{ errorMsg }}</p>
    <template #footer>
      <button @click="errorMsg = null">OK</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.tsp-sidebar {
  width: 260px;
  background: var(--header-bg);
  border-left: 1px solid var(--grid-large);
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 0;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  overflow-x: hidden;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 500;
  padding-bottom: 10px;
  color: var(--text);
  text-align: center;
  border-bottom: 1px solid var(--grid-large);
}

.section {
  padding: 10px 0;
  border-bottom: 1px solid var(--grid-large);
}

.section:last-child {
  border-bottom: none;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--edge-pending);
}

/* Algorithm selector */

.algo-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.algo-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s;
}

.algo-option:hover {
  background: var(--grid);
}

.algo-option.active {
  background: var(--canvas-bg);
  border-color: var(--grid-large);
}

.algo-option input[type='radio'] {
  accent-color: var(--blue-btn);
  cursor: pointer;
}

/* Parameters */

.param-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 0;
}

.param-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.param-value {
  font-weight: 600;
  color: var(--blue-btn);
}

.param-input.number {
  padding: 6px 8px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: var(--canvas-bg);
  width: 100%;
}

.param-input.range {
  width: 100%;
  accent-color: var(--blue-btn);
}

.param-input.select {
  padding: 6px 8px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: var(--canvas-bg);
  width: 100%;
  cursor: pointer;
}

/* Run */

.run-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.run-btn {
  padding: 10px;
  font-weight: 600;
}

/* Result */

.result-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-label {
  color: var(--edge-pending);
}

.result-tour {
  font-size: 11px;
  background: var(--canvas-bg);
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  padding: 6px 8px;
  line-height: 1.6;
  margin-top: 4px;
}

.result-value {
  font-variant-numeric: tabular-nums;
}

/* Chart */

.chart-section {
  padding-bottom: 0;
  border-bottom: none;
}

.mini-chart {
  height: 120px;
  cursor: pointer;
}

.mini-chart:hover {
  border-color: var(--vertex-selected);
}

.full-chart {
  height: 400px;
}

/* Disabled state during algorithm run */

.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
