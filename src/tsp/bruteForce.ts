import type { Graph } from '../state/graph'
import type { AlgoConfig, TspResult, ParamValues, ProgressCallback } from './types'
import { buildDistMatrix, sleep, tourLength } from './utils'

export const bruteForceConfig: AlgoConfig = {
  id: 'bruteforce',
  label: 'Полный перебор',
  params: [],
  run: runBruteForce,
}

export function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield arr.slice()
    return
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1))
    for (const perm of permutations(rest)) {
      yield [arr[i]!, ...perm]
    }
  }
}

export async function runBruteForce(
  graph: Graph,
  _params: ParamValues, // unused for brute force
  animate: boolean,
  animationDelay: number,
  onProgress: ProgressCallback,
): Promise<TspResult> {
  const vertices = Array.from(graph.vertices)
  const distMatrix = buildDistMatrix(graph)

  // Fix the first vertex and iterate through the permutations of the remaining ones
  const start = vertices[0]!
  const rest = vertices.slice(1).map((v) => v.name)
  const startName = start.name

  let bestLength = Infinity
  let bestTour: string[] = []
  const history: number[] = []
  let iterations = 0

  for (const perm of permutations(rest)) {
    const tour = [startName, ...perm]
    const length = tourLength(tour, distMatrix)
    iterations++

    if (length < bestLength) {
      bestLength = length
      bestTour = perm
    }

    history.push(bestLength)

    if (animate) {
      onProgress({
        bestTour: bestLength < Infinity ? [startName, ...bestTour, startName] : [],
        bestLength,
        history,
        iterations,
      })

      if (animationDelay > 0) {
        await sleep(animationDelay)
      }
    }
  }

  return {
    bestTour: bestLength < Infinity ? [startName, ...bestTour, startName] : [],
    bestLength,
    history,
    iterations,
  }
}
