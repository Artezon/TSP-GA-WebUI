import type { Vertex, Graph } from '../state/graph'

export function computeForceDirectedLayout(graph: Graph): Map<Vertex, { x: number; y: number }> {
  const positions = new Map<Vertex, { x: number; y: number }>()
  const vertices = Array.from(graph.vertices)
  const n = vertices.length

  if (n === 0) return positions

  if (n === 1) {
    positions.set(vertices[0]!, { x: 0, y: 0 })
    return positions
  }

  // Build shortest-path distance matrix using Floyd-Warshall
  const idx = new Map<Vertex, number>()
  vertices.forEach((v, i) => idx.set(v, i))

  const D: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)),
  )

  for (const e of graph.edges) {
    const i = idx.get(e.v1)!
    const j = idx.get(e.v2)!
    D[i]![j] = Math.min(D[i]![j]!, e.weight)
    D[j]![i] = Math.min(D[j]![i]!, e.weight)
  }

  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (D[i]![k]! + D[k]![j]! < D[i]![j]!) D[i]![j] = D[i]![k]! + D[k]![j]!

  // Replace Infinity (disconnected pairs) with twice the largest finite distance
  let maxFinite = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (D[i]![j]! < Infinity) maxFinite = Math.max(maxFinite, D[i]![j]!)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (D[i]![j]! === Infinity) D[i]![j] = maxFinite * 2

  // Double centering: B = -0.5 * H * D^2 * H, where H = I - (1/n)*11^T
  const D2: number[][] = D.map((row) => row.map((d) => d * d))
  const rowMean = D2.map((row) => row.reduce((a, b) => a + b, 0) / n)
  const totalMean = rowMean.reduce((a, b) => a + b, 0) / n

  const B: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: n },
      (_, j) => -0.5 * (D2[i]![j]! - rowMean[i]! - rowMean[j]! + totalMean),
    ),
  )

  // Power iteration to find the two dominant eigenvectors
  const powerIteration = (deflate?: number[]): number[] => {
    let vec = Array.from({ length: n }, () => Math.random() - 0.5)
    if (deflate) {
      const dot = vec.reduce((s, v, i) => s + v * deflate[i]!, 0)
      vec = vec.map((v, i) => v - dot * deflate[i]!)
    }
    for (let iter = 0; iter < 200; iter++) {
      const next = B.map((row) => row.reduce((s, v, j) => s + v * vec[j]!, 0))
      const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0))
      if (norm < 1e-10) break
      const newVec = next.map((v) => v / norm)
      // Re-orthogonalize against the deflation vector (Gram-Schmidt)
      if (deflate) {
        const dot = newVec.reduce((s, v, i) => s + v * deflate[i]!, 0)
        newVec.forEach((_, i) => (newVec[i] = newVec[i]! - dot * deflate[i]!))
        const norm2 = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0))
        newVec.forEach((_, i) => (newVec[i] = newVec[i]! / (norm2 || 1)))
      }
      vec = newVec
    }
    return vec
  }

  const e1 = powerIteration()
  const e2 = powerIteration(e1)

  const eigenvalue = (ev: number[]) =>
    B.reduce((s, row, i) => s + row.reduce((ss, v, j) => ss + v * ev[j]!, 0) * ev[i]!, 0)

  // Scale each axis by the square root of its eigenvalue
  const sx = Math.sqrt(Math.max(0, eigenvalue(e1)))
  const sy = Math.sqrt(Math.max(0, eigenvalue(e2)))

  for (let i = 0; i < n; i++) {
    positions.set(vertices[i]!, {
      x: sx * e1[i]!,
      y: sy * e2[i]!,
    })
  }

  return positions
}
