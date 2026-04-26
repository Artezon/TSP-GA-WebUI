import type { Edge, Vertex } from './graph'

export interface Selection {
  vertices: Set<Vertex>
  edges: Set<Edge>
}

export function emptySelection(): Selection {
  return { vertices: new Set(), edges: new Set() }
}
