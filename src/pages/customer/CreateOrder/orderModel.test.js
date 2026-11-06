import { describe, expect, it } from 'vitest'
import { orderDetailsSchema, toCreateOrder, validOrderItems } from './orderModel'

const weighted = { service: { id: 'wash', unit: 'KG' }, quantity: 1 }
const perItem = { service: { id: 'iron', unit: 'piece' }, quantity: 2 }

describe('order input contract', () => {
  it.each([1, 2, 3])('sends the selected supported payment method %s', async (paymentMethod) => {
    expect(toCreateOrder({ items: [perItem], locker: { id: 'locker' }, box: { id: 'box' }, paymentMethod }).paymentMethod).toBe(paymentMethod)
    await expect(orderDetailsSchema.validate({ paymentMethod })).resolves.toMatchObject({ paymentMethod })
    await expect(orderDetailsSchema.validate({ paymentMethod: 99 })).rejects.toThrow('customer.payment.invalidMethod')
  })
  it('accepts mixed services and rejects invalid quantities or duplicates', () => {
    expect(validOrderItems([weighted, perItem])).toBe(true)
    for (const quantity of ['', 0, 1.5, 1001, NaN]) {
      expect(validOrderItems([{ ...perItem, quantity }])).toBe(false)
    }
    expect(validOrderItems([weighted, weighted])).toBe(false)
    expect(validOrderItems([{ ...weighted, quantity: 2 }])).toBe(false)
    expect(validOrderItems([])).toBe(false)
  })

  it('limits the selection to thirty unique services', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ ...perItem, service: { id: `service-${i}`, unit: 'piece' } }))
    expect(validOrderItems(items)).toBe(true)
    expect(validOrderItems([...items, weighted])).toBe(false)
  })

  it('sends identifiers and quantity, without trusting client prices or customer identity', () => {
    const result = toCreateOrder({ items: [weighted, perItem], locker: { id: 'locker' }, box: { id: 'box' }, customerNote: '  careful  ', promotionCode: ' CODE ' })
    expect(result).toEqual({
      lockerId: 'locker', boxId: 'box', returnLockerId: 'locker', paymentMethod: 1,
      customerNote: 'careful', promotionCode: 'CODE',
      items: [{ serviceId: 'wash', quantity: 1 }, { serviceId: 'iron', quantity: 2 }]
    })
  })

  it('trims optional text and validates note and code lengths', async () => {
    expect(await orderDetailsSchema.validate({ customerNote: ' hi ', promotionCode: ' CODE ' })).toEqual({ customerNote: 'hi', promotionCode: 'CODE' })
    await expect(orderDetailsSchema.validate({ customerNote: 'x'.repeat(501) })).rejects.toThrow('customer.order.noteTooLong')
    await expect(orderDetailsSchema.validate({ promotionCode: 'x'.repeat(51) })).rejects.toThrow('customer.order.codeTooLong')
  })
})
