export interface GenerateOptions {
  vertexCount: number
  density: number
  minEdgeLength?: number
  graphSize?: number
}

export function generateRandomGraph(options: GenerateOptions): string {
  const n = options.vertexCount
  const size = options.graphSize ?? 1000
  const minDist = options.minEdgeLength ?? 0

  const points: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    let attempts = 0
    while (true) {
      const candidate = {
        x: Math.floor(Math.random() * size),
        y: Math.floor(Math.random() * size),
      }
      const tooClose =
        minDist > 0 &&
        points.some((p) => {
          const dx = p.x - candidate.x
          const dy = p.y - candidate.y
          return Math.sqrt(dx * dx + dy * dy) < minDist
        })
      if (!tooClose || attempts++ > 1000) {
        points.push(candidate)
        break
      }
    }
  }

  const allEdges: { v1: number; v2: number; weight: number }[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = points[i]!.x - points[j]!.x
      const dy = points[i]!.y - points[j]!.y
      const weight = Math.round(Math.sqrt(dx * dx + dy * dy))
      allEdges.push({ v1: i + 1, v2: j + 1, weight })
    }
  }

  const density = options.density / 100
  const maxEdges = allEdges.length
  const edgeCount = Math.min(maxEdges, Math.max(n - 1, Math.floor(density * maxEdges)))

  // Hamiltonian cycle first — guarantees connectivity and at least one valid TSP tour
  const shuffled = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  const usedEdges = new Set<string>()
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    usedEdges.add(key)
  }

  for (let i = 0; i < n; i++) {
    addEdge(shuffled[i]! + 1, shuffled[(i + 1) % n]! + 1)
  }

  // Add remaining edges in ascending weight order (nearest neighbors first)
  allEdges.sort((a, b) => a.weight - b.weight)
  for (const e of allEdges) {
    if (usedEdges.size >= edgeCount) break
    const key = e.v1 < e.v2 ? `${e.v1}-${e.v2}` : `${e.v2}-${e.v1}`
    usedEdges.add(key)
  }

  // Look up weights from the precomputed table
  const weightMap = new Map<string, number>()
  for (const e of allEdges) {
    const key = e.v1 < e.v2 ? `${e.v1}-${e.v2}` : `${e.v2}-${e.v1}`
    weightMap.set(key, e.weight)
  }

  const finalEdges: string[] = []
  for (const key of usedEdges) {
    const [v1, v2] = key.split('-')
    const weight = weightMap.get(key) ?? 1
    finalEdges.push(`${v1} ${v2} ${weight}`)
  }

  return finalEdges.join('\n')
}
