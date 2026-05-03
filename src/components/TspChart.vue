<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { convertHexToRGBA } from '@/utils/color'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
)

const props = withDefaults(
  defineProps<{
    history: number[]
    averageHistory?: number[]
    type: 'mini' | 'full'
  }>(),
  {
    averageHistory: () => [],
  },
)

const emit = defineEmits<{
  click: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function buildChart(canvas: HTMLCanvasElement) {
  chart?.destroy()
  chart = null

  const labels = props.history.map((_, i) => i + 1)
  const isMini = props.type === 'mini'
  const width = isMini ? 1.5 : 2

  const rootStyle = getComputedStyle(document.documentElement)
  const bestColor = rootStyle.getPropertyValue('--blue-btn')
  const averageColor = rootStyle.getPropertyValue('--average-chart-line')

  const datasets = [
    {
      label: 'Кратчайший маршрут',
      data: props.history,
      borderColor: bestColor,
      borderWidth: width,
      backgroundColor: convertHexToRGBA(bestColor, 0.1),
      fill: true,
      pointRadius: 0,
    },
  ]

  if (props.averageHistory.length > 0 && props.averageHistory.length === props.history.length) {
    datasets.push({
      label: 'Средний маршрут в популяции',
      data: props.averageHistory,
      borderColor: averageColor,
      borderWidth: width,
      backgroundColor: convertHexToRGBA(averageColor, 0.1),
      fill: true,
      pointRadius: 0,
    })
  }

  chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: !isMini ? { top: 3, bottom: 3, left: 3, right: 8 } : 0,
      },
      events: isMini ? [] : undefined,
      interaction: {
        mode: 'index',
        axis: 'x',
        intersect: false,
      },
      plugins: {
        legend: {
          display: !isMini,
          position: 'top',
          align: 'end',
          labels: { font: { size: 12 }, usePointStyle: true },
        },
        tooltip: {
          enabled: !isMini,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
            title: (items) => `Итерация ${items[0]?.label}`,
          },
        },
      },
      scales: {
        x: {
          display: !isMini,
          title: { display: true, text: 'Итерация' },
          ticks: { maxTicksLimit: 10 },
        },
        y: {
          display: !isMini,
          title: { display: true, text: 'Длина маршрута' },
        },
      },
    },
  })
}

onMounted(() => {
  if (canvasRef.value && props.history.length > 0) {
    buildChart(canvasRef.value)
  }
})

watch(
  () => props.history,
  async () => {
    await nextTick()
    if (canvasRef.value && props.history.length > 0) {
      buildChart(canvasRef.value)
    } else {
      chart?.destroy()
      chart = null
      if (canvasRef.value) {
        const ctx = canvasRef.value.getContext('2d')
        ctx?.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      }
    }
  },
)

onBeforeUnmount(() => {
  chart?.destroy()
})
</script>

<template>
  <div class="chart-wrapper" @click="emit('click')">
    <canvas ref="canvasRef"></canvas>
    <div v-if="history.length === 0" class="chart-placeholder">Здесь появится график</div>
    <div v-else-if="type === 'mini'" class="chart-placeholder">Нажмите, чтобы увеличить</div>
    <div v-else class="chart-placeholder"></div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  background: var(--canvas-bg);
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  overflow: hidden;
}

.chart-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--edge-pending);
  pointer-events: none;
}
</style>
