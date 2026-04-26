import type { Edge, Vertex } from './graph'

export type Mode = 'select' | 'move' | 'add' | 'remove'

export const MODES: { value: Mode; label: string }[] = [
  { value: 'select', label: 'Select' },
  { value: 'move', label: 'Move Canvas' },
  { value: 'add', label: 'Add' },
  { value: 'remove', label: 'Remove' },
]

export interface Selection {
  vertices: Set<Vertex>
  edges: Set<Edge>
}

export function emptySelection(): Selection {
  return { vertices: new Set(), edges: new Set() }
}
