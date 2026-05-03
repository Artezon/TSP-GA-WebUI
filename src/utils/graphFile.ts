import type { Graph } from '../state/graph'

export interface SerializableGraph {
  vertices: { name: string; x: number; y: number }[]
  edges: { v1: string; v2: string; w: number }[]
}

export function loadGraphFromFile(
  onSuccess: (vertices: SerializableGraph['vertices'], edgeListText: string) => void,
  onError: (message: string) => void,
) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as SerializableGraph
      if (!data.vertices || !data.edges) throw new Error('Invalid JSON format')
      const edgeListText = data.edges.map((e) => `${e.v1} ${e.v2} ${e.w}`).join('\n')
      onSuccess(data.vertices, edgeListText)
    } catch {
      onError('Не удалось загрузить граф. Возможно, файл повреждён или не является файлом графа.')
    }
  }
  input.click()
}

export function saveGraphToFile(graph: Graph) {
  const data: SerializableGraph = {
    vertices: Array.from(graph.vertices),
    edges: Array.from(graph.edges).map((e) => ({
      v1: e.v1.name,
      v2: e.v2.name,
      w: e.weight,
    })),
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'graph.json'
  a.click()
  URL.revokeObjectURL(url)
}
