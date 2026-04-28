export interface Vertex {
  name: string
  x: number
  y: number
}

export interface Edge {
  v1: Vertex
  v2: Vertex
  weight: number
}

export interface Graph {
  vertices: Set<Vertex>
  edges: Set<Edge>
  nextVertexNum: number
  adjacency: Map<Vertex, Set<Edge>>
}

export function createGraph(): Graph {
  return {
    vertices: new Set(),
    edges: new Set(),
    nextVertexNum: 1,
    adjacency: new Map(),
  }
}

export function addVertex(g: Graph, x: number, y: number): Vertex {
  const v: Vertex = { name: String(g.nextVertexNum++), x: Math.round(x), y: Math.round(y) }
  g.vertices.add(v)
  g.adjacency.set(v, new Set())
  return v
}

export function removeVertex(g: Graph, v: Vertex) {
  g.vertices.delete(v)
  for (const e of g.adjacency.get(v) ?? []) {
    removeEdge(g, e)
  }
  g.adjacency.delete(v)
}

export function addEdge(g: Graph, v1: Vertex, v2: Vertex): Edge | null {
  if (v1 === v2) return null
  // check for existing edge
  for (const e of g.adjacency.get(v1) ?? []) {
    if (e.v1 === v2 || e.v2 === v2) return null
  }

  const w = getDistance(v1, v2)
  const e: Edge = { v1: v1, v2: v2, weight: Math.round(w) }
  g.edges.add(e)
  g.adjacency.get(v1)!.add(e)
  g.adjacency.get(v2)!.add(e)
  return e
}

export function removeEdge(g: Graph, e: Edge) {
  g.edges.delete(e)
  g.adjacency.get(e.v1)?.delete(e)
  g.adjacency.get(e.v2)?.delete(e)
}

export function getDistance(v1: Vertex, v2: Vertex): number {
  return Math.hypot(v1.x - v2.x, v1.y - v2.y) / 10
}

export function setPos(v: Vertex, x: number, y: number) {
  v.x = Math.round(x)
  v.y = Math.round(y)
}

export function setWeight(e: Edge, w: number) {
  e.weight = w
}

export function getVertexAt(g: Graph, x: number, y: number, radius: number): Vertex | null {
  for (const v of g.vertices) {
    if (Math.hypot(v.x - x, v.y - y) <= radius) return v
  }
  return null
}

export function findEdgeAt(g: Graph, x: number, y: number, threshold: number): Edge | null {
  for (const e of g.edges) {
    const { v1, v2 } = e
    const edgeLenSquared = (v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2
    if (edgeLenSquared === 0) continue
    const t = Math.max(
      0,
      Math.min(1, ((x - v1.x) * (v2.x - v1.x) + (y - v1.y) * (v2.y - v1.y)) / edgeLenSquared),
    )
    const closestX = v1.x + t * (v2.x - v1.x)
    const closestY = v1.y + t * (v2.y - v1.y)
    const distanceSquared = (x - closestX) ** 2 + (y - closestY) ** 2
    if (distanceSquared <= threshold * threshold) return e
  }
  return null
}

export function clearGraph(g: Graph) {
  g.vertices.clear()
  g.edges.clear()
  g.nextVertexNum = 0
  g.adjacency.clear()
}
