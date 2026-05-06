import type { Edge, Graph, Vertex } from '../state/graph'
import type { Selection } from '../state/ui'

const GRID_STEP_1 = 50
const GRID_STEP_2 = GRID_STEP_1 * 5

export const NODE_RADIUS = 12
export const NODE_STROKE = 2
export const NODE_NAME_FONT_SIZE = 10
export const EDGE_WIDTH = 2
export const EDGE_LABEL_FONT_SIZE = 10
export const EDGE_PENDING_DASH = 5
export const EDGE_HIT_THRESHOLD = 7

interface Colors {
  bg: string
  grid: string
  gridLarge: string
  vertex: string
  vertexStroke: string
  vertexSelected: string
  edge: string
  edgeSelected: string
  graphText: string
  selection: string
  selectionBox: string
}

let colors: Colors
let fontFamily: string

export function getColors() {
  const style = getComputedStyle(document.documentElement)
  colors = {
    bg: style.getPropertyValue('--canvas-bg'),
    grid: style.getPropertyValue('--grid'),
    gridLarge: style.getPropertyValue('--grid-large'),
    vertex: style.getPropertyValue('--vertex'),
    vertexStroke: style.getPropertyValue('--vertex-stroke'),
    vertexSelected: style.getPropertyValue('--blue-btn'),
    edge: style.getPropertyValue('--edge'),
    edgeSelected: style.getPropertyValue('--blue-btn'),
    graphText: style.getPropertyValue('--graph-text'),
    selection: style.getPropertyValue('--selection'),
    selectionBox: style.getPropertyValue('--selection-box'),
  }
}

export function getFonts() {
  const style = getComputedStyle(document.documentElement)
  fontFamily = style.getPropertyValue('--font-family')
}

function dpr() {
  return window.devicePixelRatio || 1
}

export interface DrawOptions {
  showVertexNames?: boolean
  showEdgeWeights?: boolean
  showOnlySelectedEdges?: boolean
}

export function draw(
  canvas: HTMLCanvasElement,
  vx: number,
  vy: number,
  zoom: number,
  graph: Graph,
  selection: Selection,
  drawOptions: DrawOptions = {},
) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const d = dpr()

  ctx.save()
  ctx.setTransform(d, 0, 0, d, 0, 0)
  drawBackground(ctx, W, H)
  drawGrid(ctx, W, H, vx, vy, zoom)

  // Apply the viewport transform, everything drawn after this is in world space
  ctx.translate(vx * zoom, vy * zoom)
  ctx.scale(zoom, zoom)

  drawEdges(ctx, graph, selection, zoom, drawOptions.showOnlySelectedEdges)
  if (drawOptions.showEdgeWeights) {
    drawEdgeLabels(ctx, graph, selection, zoom, drawOptions.showOnlySelectedEdges)
  }
  drawVertices(ctx, graph, selection, zoom, drawOptions.showVertexNames)

  ctx.restore()
}

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, W, H)
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  vx: number,
  vy: number,
  zoom: number,
) {
  function grid(step: number, color: string, width: number) {
    const ox = (vx * zoom) % (step * zoom)
    const oy = (vy * zoom) % (step * zoom)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    for (let x = ox; x < W; x += step * zoom) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = oy; y < H; y += step * zoom) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
  }

  grid(GRID_STEP_1, colors.grid, 1)
  grid(GRID_STEP_2, colors.gridLarge, 1)
}

export function drawVertices(
  ctx: CanvasRenderingContext2D,
  graph: Graph,
  selection: Selection,
  zoom: number,
  showNames = true,
) {
  function _draw(v: Vertex, selected: boolean) {
    ctx.beginPath()
    ctx.arc(v.x, v.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = colors.vertex
    ctx.fill()
    ctx.strokeStyle = selected ? colors.vertexSelected : colors.vertexStroke
    ctx.lineWidth = stroke
    ctx.stroke()
    if (showNames) {
      ctx.fillStyle = colors.graphText
      ctx.fillText(String(v.name), v.x, v.y)
    }
  }

  const radius = NODE_RADIUS / zoom
  let stroke = NODE_STROKE / zoom
  ctx.font = `${NODE_NAME_FONT_SIZE / zoom}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const v of graph.vertices) {
    if (selection.vertices.has(v)) continue
    _draw(v, false)
  }
  stroke *= 1.5
  for (const v of selection.vertices) {
    _draw(v, true)
  }
}

export function drawEdges(
  ctx: CanvasRenderingContext2D,
  graph: Graph,
  selection: Selection,
  zoom: number,
  showOnlySelectedEdges = false,
) {
  function _draw(e: Edge, selected: boolean) {
    ctx.beginPath()
    ctx.moveTo(e.v1.x, e.v1.y)
    ctx.lineTo(e.v2.x, e.v2.y)
    ctx.strokeStyle = selected ? colors.edgeSelected : colors.edge
    ctx.stroke()
  }

  const width = EDGE_WIDTH / zoom
  ctx.lineWidth = width

  if (!showOnlySelectedEdges) {
    for (const e of graph.edges) {
      if (selection.edges.has(e)) continue
      _draw(e, false)
    }
  }

  ctx.lineWidth *= 1.5
  for (const e of selection.edges) {
    _draw(e, true)
  }
}

export function drawEdgeLabels(
  ctx: CanvasRenderingContext2D,
  graph: Graph,
  selection: Selection,
  zoom: number,
  showOnlySelectedEdges = false,
) {
  ctx.save()
  ctx.font = `${EDGE_LABEL_FONT_SIZE / zoom}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineWidth = EDGE_WIDTH / zoom
  for (const e of graph.edges) {
    const midX = (e.v1.x + e.v2.x) / 2
    const midY = (e.v1.y + e.v2.y) / 2
    const text = String(e.weight)
    const metrics = ctx.measureText(text)
    const padding = 4 / zoom
    const boxWidth = metrics.width + padding * 2
    const boxHeight = EDGE_LABEL_FONT_SIZE / zoom + padding * 2
    const cornerRadius = 4 / zoom
    const selected = selection.edges.has(e)
    if (showOnlySelectedEdges && !selected) continue
    ctx.fillStyle = colors.vertex
    ctx.strokeStyle = selected ? colors.edgeSelected : colors.edge
    ctx.lineWidth = selected ? lineWidth * 1.5 : lineWidth
    ctx.beginPath()
    ctx.roundRect(midX - boxWidth / 2, midY - boxHeight / 2, boxWidth, boxHeight, cornerRadius)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = colors.graphText
    ctx.fillText(text, midX, midY)
  }
  ctx.restore()
}
