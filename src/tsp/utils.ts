import type { Graph } from '@/state/graph'

export function tourLength(tour: string[], distMatrix: Map<string, Map<string, number>>): number {
  let total = 0
  for (let i = 0; i < tour.length; i++) {
    const from = tour[i]!
    const to = tour[(i + 1) % tour.length]!
    const d = distMatrix.get(from)?.get(to)
    if (d === undefined) return Infinity
    total += d
  }
  return total
}

export function buildDistMatrix(graph: Graph): Map<string, Map<string, number>> {
  const distMatrix = new Map<string, Map<string, number>>()
  for (const e of graph.edges) {
    if (!distMatrix.has(e.v1.name)) distMatrix.set(e.v1.name, new Map())
    if (!distMatrix.has(e.v2.name)) distMatrix.set(e.v2.name, new Map())
    distMatrix.get(e.v1.name)!.set(e.v2.name, e.weight)
    distMatrix.get(e.v2.name)!.set(e.v1.name, e.weight)
  }
  return distMatrix
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
