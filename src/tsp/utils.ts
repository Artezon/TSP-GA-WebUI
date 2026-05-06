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

export function shuffleArray<T>(arr: T[]): T[] {
  const result = arr.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i]!, result[j]!] = [result[j]!, result[i]!]
  }
  return result
}

export function createRandomTour(vertices: string[]): string[] {
  return shuffleArray(vertices)
}

export function createRandomSparseValidTour(
  vertices: string[],
  distMatrix: Map<string, Map<string, number>>,
): string[] {
  const tour: string[] = []
  const remaining = new Set(vertices)

  if (remaining.size === 0) return tour

  let current = vertices[Math.floor(Math.random() * vertices.length)]!
  tour.push(current)
  remaining.delete(current)

  while (remaining.size > 0) {
    const neighbors = distMatrix.get(current)
    const candidates: string[] = []
    for (const v of remaining) {
      if (neighbors?.has(v)) candidates.push(v)
    }

    if (candidates.length > 0) {
      current = candidates[Math.floor(Math.random() * candidates.length)]!
    } else {
      const idx = Math.floor(Math.random() * remaining.size)
      let i = 0
      for (const v of remaining) {
        if (i++ === idx) {
          current = v
          break
        }
      }
    }

    tour.push(current)
    remaining.delete(current)
  }

  return tour
}
