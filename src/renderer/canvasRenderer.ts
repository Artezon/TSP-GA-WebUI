const GRID_STEP_1 = 50
const GRID_STEP_2 = GRID_STEP_1 * 5

interface Colors {
  bg: string
  grid: string
  gridLarge: string
}

let colors: Colors

export function getColors() {
  const style = getComputedStyle(document.documentElement)
  colors = {
    bg: style.getPropertyValue('--bg'),
    grid: style.getPropertyValue('--grid'),
    gridLarge: style.getPropertyValue('--grid-large'),
  }
}

function dpr() {
  return window.devicePixelRatio || 1
}

export function draw(canvas: HTMLCanvasElement, vx: number, vy: number, zoom: number) {
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

  // TODO

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
