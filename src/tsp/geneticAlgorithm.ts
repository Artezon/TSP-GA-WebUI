import type { Graph } from '@/state/graph'
import type { AlgoConfig, TspResult, ParamValues, ProgressCallback } from './types'
import { buildDistMatrix, tourLength, sleep, createRandomSparseValidTour } from './utils'

export const geneticAlgorithmConfig: AlgoConfig = {
  id: 'genetic-algorithm',
  label: 'Генетический алгоритм',
  params: [
    {
      key: 'populationSize',
      label: 'Размер популяции',
      type: 'number',
      min: 10,
      max: 5000,
      step: 1,
      default: 1000,
    },
    {
      key: 'generations',
      label: 'Поколений',
      type: 'number',
      min: 10,
      max: 5000,
      step: 1,
      default: 500,
    },
    {
      key: 'evolutionModel',
      label: 'Модель эволюции',
      type: 'select',
      options: [
        ['darwin', 'Модель Дарвина'],
        ['de-vries', 'Модель Де-Фриза (катастроф)'],
        ['lamarck', 'Модель Ламарка (локальный поиск 2-opt)'],
      ],
      default: 'darwin',
    },
    {
      key: 'selectionType',
      label: 'Селекция',
      type: 'select',
      options: [
        ['tournament', 'Турнир (рекомендуется)'],
        ['roulette', 'Рулетка'],
      ],
      default: 'tournament',
    },
    {
      key: 'tournamentSize',
      label: 'Размер турнира',
      type: 'number',
      min: 2,
      max: 50,
      step: 1,
      default: 5,
      showIf: { key: 'selectionType', value: 'tournament' },
    },
    {
      key: 'crossoverType',
      label: 'Кроссовер',
      type: 'select',
      options: [
        ['ox', 'Упорядоченный кроссовер'],
        ['pmx', 'Частично соответствующий кроссовер'],
      ],
      default: 'ox',
    },
    {
      key: 'crossoverRate',
      label: 'Вероятность кроссовера',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.8,
    },
    {
      key: 'mutationType',
      label: 'Мутация',
      type: 'select',
      options: [
        ['swap', 'Случ. обмен позициями двух городов'],
        ['insertion', 'Перемещение города в случ. позицию'],
        ['inversion', 'Инверсия случ. фрагмента (рекомендуется)'],
      ],
      default: 'inversion',
    },
    {
      key: 'mutationRate',
      label: 'Вероятность мутации',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.05,
    },
    {
      key: 'eliteCount',
      label: 'Количество элитных особей',
      type: 'range',
      min: 0,
      max: 10,
      step: 1,
      default: 1,
    },
    {
      key: 'stagnationGenerations',
      label: 'Остановить, если N поколений без улучшений (0 = откл)',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      default: 0,
    },
    {
      key: 'catastropheInterval',
      label: '[Де-Фриз] Интервал катастрофы (в поколениях)',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      default: 10,
      showIf: { key: 'evolutionModel', value: 'de-vries' },
    },
    {
      key: 'catastropheProbability',
      label: '[Де-Фриз] Вероятность катастрофы',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      showIf: { key: 'evolutionModel', value: 'de-vries' },
    },
    {
      key: 'catastropheDestroyRate',
      label: '[Де-Фриз] Доля уничтожения популяции',
      type: 'number',
      min: 0.1,
      max: 0.99,
      step: 0.01,
      default: 0.8,
      showIf: { key: 'evolutionModel', value: 'de-vries' },
    },
    {
      key: 'lamarckIterations',
      label: '[Ламарк] Итераций локального поиска (2-opt) на особь (маршрут)',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      default: 5,
      showIf: { key: 'evolutionModel', value: 'lamarck' },
    },
  ],
  run: runGeneticAlgorithm,
}

function createPopulation(
  size: number,
  vertices: string[],
  distMatrix: Map<string, Map<string, number>>,
): string[][] {
  return Array.from({ length: size }, () => createRandomSparseValidTour(vertices, distMatrix))
}

function twoOpt(
  tour: string[],
  distMatrix: Map<string, Map<string, number>>,
  iterations: number,
): string[] {
  let bestTour = tour.slice()
  let bestLength = tourLength(bestTour, distMatrix)
  let iter = 0
  let improved = true

  while (improved && iter < iterations) {
    improved = false
    iter++

    for (let i = 0; i < bestTour.length - 1; i++) {
      for (let j = i + 1; j < bestTour.length; j++) {
        const newTour = bestTour.slice()
        // Reverse the segment from i to j
        newTour.splice(i, j - i + 1, ...newTour.slice(i, j + 1).reverse())
        const newLength = tourLength(newTour, distMatrix)
        if (newLength < bestLength) {
          bestTour = newTour
          bestLength = newLength
          improved = true
        }
      }
    }
  }

  return bestTour
}

function tournamentSelect(
  population: string[][],
  lengths: number[],
  tournamentSize: number,
): string[] {
  const indices = Array.from({ length: tournamentSize }, () =>
    Math.floor(Math.random() * population.length),
  )
  let bestIdx = indices[0]!
  for (const idx of indices) {
    if (lengths[idx]! < lengths[bestIdx]!) {
      bestIdx = idx
    }
  }
  return population[bestIdx]!
}

function rouletteSelect(population: string[][], lengths: number[]): string[] {
  const maxLen = Math.max(...lengths)
  const weights = lengths.map((l) => (l === Infinity ? 0 : maxLen - l))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) return population[Math.floor(Math.random() * population.length)]!
  let r = Math.random() * totalWeight
  for (let i = 0; i < population.length; i++) {
    r -= weights[i]!
    if (r <= 0) return population[i]!
  }
  return population[population.length - 1]!
}

function orderCrossover(mom: string[], dad: string[]): [string[], string[]] {
  const len = mom.length
  const start = Math.floor(Math.random() * len)
  const end = start + Math.floor(Math.random() * (len - start))

  const makeChild = (first: string[], second: string[]): string[] => {
    const child: (string | null)[] = Array(len).fill(null)
    const segment = first.slice(start, end)
    child.splice(start, segment.length, ...segment)
    let idx = 0
    for (let i = 0; i < len; i++) {
      if (child[i] === null) {
        while (segment.includes(second[idx]!)) idx++
        child[i] = second[idx]!
        idx++
      }
    }
    return child as string[]
  }

  return [makeChild(mom, dad), makeChild(dad, mom)]
}

function PartiallyMappedCrossover(mom: string[], dad: string[]): [string[], string[]] {
  const len = mom.length
  const start = Math.floor(Math.random() * len)
  const end = start + Math.floor(Math.random() * (len - start))

  const makeChild = (first: string[], second: string[]): string[] => {
    const child = Array(len).fill(null)
    for (let i = start; i < end; i++) child[i] = second[i]

    const map = new Map<string, string>()
    for (let i = start; i < end; i++) {
      map.set(second[i]!, first[i]!)
    }

    for (let i = 0; i < len; i++) {
      if (i >= start && i < end) continue
      let gene = first[i]!
      while (map.has(gene)) gene = map.get(gene)!
      child[i] = gene
    }

    return child as string[]
  }

  return [makeChild(mom, dad), makeChild(dad, mom)]
}

function swapMutation(tour: string[]): string[] {
  const i = Math.floor(Math.random() * tour.length)
  let j
  do j = Math.floor(Math.random() * tour.length)
  while (j === i)
  const mutatedTour = tour.slice()
  ;[mutatedTour[i]!, mutatedTour[j]!] = [mutatedTour[j]!, mutatedTour[i]!]
  return mutatedTour
}

function insertionMutation(tour: string[]): string[] {
  const mutatedTour = tour.slice()
  const i = Math.floor(Math.random() * mutatedTour.length)
  const city = mutatedTour.splice(i, 1)[0]!
  const j = Math.floor(Math.random() * mutatedTour.length)
  mutatedTour.splice(j, 0, city)
  return mutatedTour
}

function inversionMutation(tour: string[]): string[] {
  const len = tour.length
  const i = Math.floor(Math.random() * len)
  const j = Math.floor(Math.random() * len)
  const start = Math.min(i, j)
  const end = Math.max(i, j)
  const mutatedTour = tour.slice()
  mutatedTour.splice(start, end - start + 1, ...mutatedTour.slice(start, end + 1).reverse())
  return mutatedTour
}

export async function runGeneticAlgorithm(
  graph: Graph,
  params: ParamValues,
  animate: boolean,
  animationDelay: number,
  onProgress: ProgressCallback,
): Promise<TspResult> {
  const vertices = Array.from(graph.vertices).map((v) => v.name)
  const distMatrix = buildDistMatrix(graph)
  const populationSize = params.populationSize as number
  const generations = params.generations as number
  const evolutionModel = params.evolutionModel as string
  const selectionType = params.selectionType as string
  const tournamentSize = params.tournamentSize as number
  const crossoverType = params.crossoverType as string
  const crossoverRate = params.crossoverRate as number
  const mutationType = params.mutationType as string
  const mutationRate = params.mutationRate as number
  const eliteCount = params.eliteCount as number
  const stagnationGenerations = params.stagnationGenerations as number

  const catastropheInterval = params.catastropheInterval as number
  const catastropheProbability = params.catastropheProbability as number
  const catastropheDestroyRate = params.catastropheDestroyRate as number
  const lamarckIterations = params.lamarckIterations as number

  if (tournamentSize > populationSize) {
    throw new Error(
      `Размер турнира (${tournamentSize}) не может превышать размер популяции (${populationSize})`,
    )
  }

  const select = (population: string[][], lengths: number[]) => {
    switch (selectionType) {
      case 'tournament':
        return tournamentSelect(population, lengths, tournamentSize)
      case 'roulette':
        return rouletteSelect(population, lengths)
      default:
        throw new Error('Invalid parameter value')
    }
  }
  const crossover = (parent1: string[], parent2: string[]) => {
    switch (crossoverType) {
      case 'ox':
        return orderCrossover(parent1, parent2)
      case 'pmx':
        return PartiallyMappedCrossover(parent1, parent2)
      default:
        throw new Error('Invalid parameter value')
    }
  }
  const mutate = (child: string[]) => {
    if (Math.random() >= mutationRate) return child
    switch (mutationType) {
      case 'swap':
        return swapMutation(child)
      case 'inversion':
        return inversionMutation(child)
      case 'insertion':
        return insertionMutation(child)
      default:
        throw new Error('Invalid parameter value')
    }
  }

  let population = createPopulation(populationSize, vertices, distMatrix)
  let lengths = population.map((t) => tourLength(t, distMatrix))
  let bestIndices = Array.from(lengths.keys()).sort((a, b) => lengths[a]! - lengths[b]!)
  let bestIdx = bestIndices[0]!
  let bestTour = population[bestIdx]!
  let bestLength = lengths[bestIdx]!
  const history: number[] = [bestLength]
  const finite = lengths.filter(isFinite)
  const averageHistory: number[] = [finite.reduce((sum, b) => sum + b, 0) / finite.length]

  let stagnationCount = 0
  for (let gen = 2; gen <= generations; gen++) {
    const elites = bestIndices.slice(0, eliteCount).map((i) => population[i]!)
    const newPopulation: string[][] = elites

    while (newPopulation.length < populationSize) {
      const parent1 = select(population, lengths)
      let parent2
      do parent2 = select(population, lengths)
      while (parent2 === parent1)

      let child1: string[], child2: string[]
      if (Math.random() < crossoverRate) {
        ;[child1, child2] = crossover(parent1, parent2)
      } else {
        ;[child1, child2] = [parent1, parent2]
      }
      child1 = mutate(child1)
      child2 = mutate(child2)
      newPopulation.push(child1, child2)
    }

    // Run 2-opt local search for all individuals (acquired traits in Lamarck model)
    if (evolutionModel === 'lamarck') {
      for (let i = 0; i < newPopulation.length; i++) {
        newPopulation[i] = twoOpt(newPopulation[i]!, distMatrix, lamarckIterations)
      }
    }

    population = newPopulation
    lengths = population.map((t) => tourLength(t, distMatrix))
    bestIndices = Array.from(lengths.keys()).sort((a, b) => lengths[a]! - lengths[b]!)
    bestIdx = bestIndices[0]!
    const genBestLength = lengths[bestIdx]!
    const genBestTour = population[bestIdx]!

    if (genBestLength < bestLength) {
      bestLength = genBestLength
      bestTour = genBestTour
      stagnationCount = 0
    } else {
      stagnationCount++
    }

    history.push(bestLength)
    const finite = lengths.filter(isFinite)
    const avg = finite.reduce((a, b) => a + b, 0) / finite.length
    averageHistory.push(avg)

    // Catastrophe check
    if (
      evolutionModel === 'de-vries' &&
      gen % catastropheInterval === 0 &&
      Math.random() < catastropheProbability
    ) {
      const numToKeep = Math.max(
        eliteCount,
        Math.ceil(populationSize * (1 - catastropheDestroyRate)),
      )

      const currentElites = bestIndices.slice(0, eliteCount).map((i) => population[i]!)
      const nonElites = population.filter((_, i) => !currentElites.includes(population[i]!))
      const shuffledNonElites = nonElites.sort(() => Math.random() - 0.5)
      const keptNonElites = shuffledNonElites.slice(0, numToKeep - eliteCount)
      const catastrophizedPopulation: string[][] = [...currentElites, ...keptNonElites]
      while (catastrophizedPopulation.length < populationSize)
        catastrophizedPopulation.push(createRandomSparseValidTour(vertices, distMatrix))

      population = catastrophizedPopulation
      lengths = population.map((t) => tourLength(t, distMatrix))
      bestIndices = Array.from(lengths.keys()).sort((a, b) => lengths[a]! - lengths[b]!)
    }

    if (stagnationGenerations > 0 && stagnationCount >= stagnationGenerations) {
      break
    }

    if (animate) {
      const closedTour = bestLength < Infinity ? [...bestTour, bestTour[0]!] : []
      onProgress({
        bestTour: closedTour,
        bestLength,
        history,
        averageHistory,
        iterations: gen,
      })
      if (animationDelay > 0) {
        await sleep(animationDelay)
      }
    }
  }

  const closedTour = bestLength < Infinity ? [...bestTour, bestTour[0]!] : []
  return {
    bestTour: closedTour,
    bestLength,
    history,
    averageHistory,
    iterations: history.length,
  }
}
