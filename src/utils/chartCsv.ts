export function downloadCsv(history: number[], averageHistory: number[]) {
  let header = 'iteration,best_length'
  let rows = history.map((v, i) => `${i + 1},${v}`)

  if (averageHistory.length > 0 && averageHistory.length === history.length) {
    header += ',average_length'
    rows = history.map((v, i) => `${i + 1},${v},${averageHistory[i]}`)
  }

  const csvContent = [header, ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tsp_history.csv'
  a.click()
  URL.revokeObjectURL(url)
}
