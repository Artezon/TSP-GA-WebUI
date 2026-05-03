import type { Graph } from '@/state/graph'

export interface ParamDef {
  key: string
  label: string
  type: 'number' | 'range'
  min?: number
  max?: number
  step?: number
  default: number
}

export type ParamValues = Record<string, number>

export type AlgoFunc = (
  graph: Graph,
  params: ParamValues,
  animate: boolean,
  animationDelay: number, // ms between updates when animating
  onProgress: ProgressCallback,
) => Promise<TspResult>

export interface AlgoConfig {
  id: string
  label: string
  params: ParamDef[]
  run: AlgoFunc
}

export interface TspResult {
  bestTour: string[] // a list of vertices in the traversal order with a closed loop, e.g. ['1', '2', '3', '1']
  bestLength: number
  history: number[] // best route length at each iteration (for the chart)
  averageHistory?: number[] // average route length at each iteration (for the GA chart)
  iterations: number // completed iterations / generations count
}

export type ProgressCallback = (intermediate: TspResult) => void

export interface AlgoHandle {
  promise: Promise<TspResult>
  stop: () => void
}
