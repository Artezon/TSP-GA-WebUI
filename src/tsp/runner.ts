import type { Graph } from '../state/graph'
import type { TspResult, ParamValues, AlgoHandle, ProgressCallback } from './types'
import TspWorker from './tspWorker.ts?worker&inline'
import { toRaw } from 'vue'

let worker: Worker = new TspWorker()

let activeRun: {
  resolve: (value: TspResult) => void
  reject: (reason?: unknown) => void
} | null = null

function createNewWorker() {
  worker = new TspWorker()
}

export function runAlgorithm(
  id: string,
  graph: Graph,
  params: ParamValues,
  animate: boolean,
  animationDelay?: number,
  onProgress?: ProgressCallback,
): AlgoHandle {
  animationDelay ??= 50

  if (activeRun) {
    return {
      promise: Promise.reject(new Error('Алгоритм уже запущен')),
      stop: () => {},
    }
  }

  const promise = new Promise<TspResult>((resolve, reject) => {
    activeRun = { resolve, reject }

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data

      if (msg.type === 'progress') {
        onProgress?.(msg.result)
      } else if (msg.type === 'done') {
        activeRun = null
        resolve(msg.result)
      } else if (msg.type === 'error') {
        activeRun = null
        reject(new Error(msg.error))
      }
    }

    worker.onerror = (err) => {
      if (activeRun) {
        activeRun = null
        reject(err)
      }
    }

    // Start algorithm in a worker
    worker.postMessage({
      type: 'run',
      algoId: id,
      graph: toRaw(graph),
      params: toRaw(params),
      animate,
      animationDelay,
    })
  })

  const stop = () => {
    if (activeRun) {
      const rejectFn = activeRun.reject
      terminateWorker()
      createNewWorker()
      rejectFn?.(new Error('Алгоритм остановлен пользователем'))
    }
  }

  return { promise, stop }
}

export function terminateWorker() {
  if (worker) {
    worker.terminate()
    activeRun = null
  }
}
