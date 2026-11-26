import { expect, it } from 'vitest'
import { actualsSchema, actualsInput, actualQuantity, actualSubTotal } from './orderActuals'
import { receiptReference } from './receiptReference'

it('allows a zero count with a reason, rejects fractional pairs and omits kg for count-only orders', async () => {
  const order = { items: [{ id: 'pair', quantity: 2, isWeightBased: false, unitSnapshot: 'pair' }] }
  const values = { items: [{ orderItemId: 'pair', actualQuantity: 0 }], actualWeightKg: '', note: 'No shoes received' }
  expect((await actualsSchema(order).validate(values)).items[0].actualQuantity).toBe(0)
  expect(actualsInput(values, order).actualWeightKg).toBeNull()
  await expect(actualsSchema(order).validate({ ...values, note: '' })).rejects.toThrow('actuals.errors.ActualsNoteRequired')
  await expect(actualsSchema(order).validate({ ...values, items: [{ orderItemId: 'pair', actualQuantity: 0.5 }] })).rejects.toThrow('actuals.errors.InvalidActualQuantity')
})
it('uses confirmed quantities including zero and leaves legacy quantities and booked subtotals intact', () => {
  const item = { quantity: 2, subTotal: 100000, actualQuantity: 0, actualSubTotal: 0 }
  expect(actualQuantity(item)).toBe(0)
  expect(actualSubTotal(item)).toBe(0)
  expect(item.quantity).toBe(2)
  expect(actualQuantity({ quantity: 2 })).toBe(2)
  expect(actualSubTotal({ subTotal: 100000 })).toBe(100000)
})
it('matches the BE receipt reference policy and never truncates a gateway ID or another order reference', () => {
  const reference = 'WG-TOTAL-WG1-a99a52a5cdc54c57a934631a64aa2b1e'
  expect(receiptReference('WG1', { reference, method: 2 })).toBe('WG-TOTAL-WG1')
  expect(receiptReference('WG2', { reference, method: 2 })).toBe(reference)
  expect(receiptReference('WG1', { reference, method: 2, providerTransactionId: 'bank-1234567890' })).toBe('bank-1234567890')
  const short = 'WG-FEE-WG1-a99a52a5cdc54c57'
  expect(receiptReference('WG1', { reference: short, method: 3 })).toBe('WG-FEE-WG1')
  expect(receiptReference('WG1', { reference: short, method: 2 })).toBe(short)
})
