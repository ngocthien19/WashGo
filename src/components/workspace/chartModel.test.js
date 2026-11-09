import { expect, it } from 'vitest'
import { chartScale, chartTickLabels } from './chartModel'

it('keeps order ticks distinct integers for sparse and empty charts', () => {
  expect(chartScale([0, 1], true).ticks).toEqual([1, 0])
  for (const values of [[], [0], [0, 2], [3, 10], [125]]) {
    const { ticks, min, max } = chartScale(values, true)
    expect(ticks.every(Number.isInteger)).toBe(true)
    expect(new Set(ticks).size).toBe(ticks.length)
    expect(max).toBeGreaterThan(min)
  }
})

it('money scale includes negative refund days and readable zero range', () => {
  const scale = chartScale([-400000, 200000])
  expect(scale.min).toBeLessThanOrEqual(-400000)
  expect(scale.max).toBeGreaterThanOrEqual(200000)
  expect(chartScale([0]).max).toBe(1000)
  expect(chartScale([-20000]).max).toBe(0)
})

it('hourly X axis shows hours without repeating dates or duplicate labels', () => {
  const points = Array.from({ length: 24 }, (_, hour) => ({ label: `08/11/2026 ${String(hour).padStart(2, '0')}:00` }))
  const labels = chartTickLabels(points, true).filter(Boolean)
  expect(labels[0]).toBe('00:00')
  expect(labels.at(-1)).toBe('23:00')
  expect(labels.every(value => !value.includes('/'))).toBe(true)
  expect(new Set(labels).size).toBe(labels.length)
  expect(chartTickLabels([{ label: '08/11' }, { label: '08/11' }]).filter(Boolean)).toEqual(['08/11'])
})
