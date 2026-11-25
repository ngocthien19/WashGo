import { expect, it } from 'vitest'
import { vi, en } from './backendSyncMessages'
const entries = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'string' ? [[`${prefix}${key}`, value]] : entries(value, `${prefix}${key}.`))
it('keeps backend synchronization messages and interpolation aligned in both languages', () => {
  const left = new Map(entries(vi)), right = new Map(entries(en))
  expect([...left.keys()]).toEqual([...right.keys()])
  for (const [key, value] of left) {
    expect([...value.matchAll(/{{(\w+)}}/g)].map(match => match[1])).toEqual([...right.get(key).matchAll(/{{(\w+)}}/g)].map(match => match[1]))
  }
})
