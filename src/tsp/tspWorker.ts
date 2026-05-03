import type { Graph } from '@/state/graph'
import type { ParamValues } from './types'
import { algorithms } from './algorithms'

// Process messages from the main thread
self.onmessage = async (e: MessageEvent) => {
  if (e.data.type == 'run') {
    const { algoId, graph, params, animate, animationDelay } = e.data as {
      algoId: string
      graph: Graph
      params: ParamValues
      animate: boolean
      animationDelay: number
    }

    const algo = algorithms.find((a) => a.id === algoId)
    if (!algo) {
      self.postMessage({ type: 'error', error: `Неизвестный алгоритм: ${algoId}` })
      return
    }

    try {
      const result = await algo.run(graph, params, animate, animationDelay, (progress) =>
        self.postMessage({ type: 'progress', result: progress }),
      )
      self.postMessage({ type: 'done', result })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      self.postMessage({ type: 'error', error: errorMessage })
    }
  }
}
