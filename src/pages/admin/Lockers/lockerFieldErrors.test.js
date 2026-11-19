import { expect, it } from 'vitest'
import { lockerFieldErrors } from './lockerModel'

it('maps server field arrays without inventing editable code, district or identity controls', () => {
  const failure = { response: { data: { errors: { Name: ['Already used'], city: ['Required'], code: ['Immutable'], actorId: ['Private'], latitude: [] } } } }
  expect(lockerFieldErrors(failure)).toEqual([['name', 'Already used'], ['city', 'Required']])
  expect(lockerFieldErrors({ response: { data: { errors: ['Legacy general error'] } } })).toEqual([])
})
