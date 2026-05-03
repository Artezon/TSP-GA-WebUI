import type { SerializableGraph } from './graphFile'

export function parseEdgeList(edgeList: string): SerializableGraph | null {
  if (!edgeList.trim()) return null
  const lines = edgeList.split('\n')
  const edges: SerializableGraph['edges'] = []
  const vertices = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    if (!line) continue
    const parts = line.trim().split(/\s+/)
    if (parts.length !== 3) throw new Error(`Неверный формат: "${line}" (строка ${lineNum})`)
    const v1 = parts[0]
    const v2 = parts[1]
    const w = parts[2]
    if (!v1 || !v2 || !w) throw new Error(`Неверный формат: "${line}" (строка ${lineNum})`)
    const weight = parseFloat(w)
    if (isNaN(weight)) throw new Error(`Недопустимое значение веса: "${w}" (строка ${lineNum})`)
    if (v1 === v2) throw new Error(`Петля не допускается: "${v1} ${v2} ${w}" (строка ${lineNum})`)
    edges.push({ v1, v2, w: weight })
    vertices.add(v1)
    vertices.add(v2)
  }

  return {
    vertices: Array.from(vertices).map((name) => ({ name, x: 0, y: 0 })),
    edges,
  }
}
