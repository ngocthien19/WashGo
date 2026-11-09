export function chartScale(values, integer = false) {
  const low = Math.min(0, ...values), high = Math.max(0, ...values)
  const span = high - low || (integer ? 4 : 1000)
  const rough = span / 4, magnitude = 10 ** Math.floor(Math.log10(rough))
  const base = [1, 2, 2.5, 5, 10].find(n => n * magnitude >= rough) * magnitude
  const step = integer ? Math.max(1, Math.ceil(base)) : base
  const min = Math.floor(low / step) * step
  const max = Math.max(min + step, Math.ceil((high === low ? span : high) / step) * step)
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step).reverse() }
}

export function chartTickLabels(points, hourly = false) {
  const used = new Set()
  return points.map((point, index) => {
    const label = hourly ? point.label.match(/\d{1,2}:\d{2}(?:\s?[AP]M)?$/i)?.[0] || point.label : point.label.replace(/\/\d{4}$/, '')
    const visible = (index % Math.max(1, Math.ceil((points.length - 1) / 5)) === 0 || index === points.length - 1) && !used.has(label)
    if (visible) {
      used.add(label)
    }
    return visible ? label : ''
  })
}
