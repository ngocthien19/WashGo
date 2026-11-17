import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerLoyaltyApi } from './customerLoyaltyApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn() } }))
const envelope = data => ({ data: { succeeded: true, data } })
const wallet = { totalPoints: 50000, heldPoints: 36000, availablePoints: 14000, debtPoints: 0, vndPerPoint: 1, earnPercent: 1, maxUsePercent: 20 }
const quote = { orderId: 'order-1', laundryAmount: 180000, availablePoints: 50000, maximumPoints: 36000, pointsToRedeem: 36000, cashAmount: 144000, expectedEarnedPoints: 1440, isEstimate: true }
beforeEach(() => vi.clearAllMocks())

it('reads the scoped full wallet, including debt and previously held points', async () => {
  const signal = new AbortController().signal
  for (const data of [wallet, { ...wallet, totalPoints: 0, availablePoints: 0, debtPoints: 5000 }]) {
    authorizedAxios.get.mockResolvedValue(envelope(data))
    expect(await customerLoyaltyApi.balance(signal)).toEqual(data)
  }
  expect(authorizedAxios.get).toHaveBeenLastCalledWith('/customer/loyalty/balance', { signal })
  for (const patch of [{ availablePoints: -1 }, { heldPoints: .5 }, { totalPoints: Number.MAX_SAFE_INTEGER + 1 }, { debtPoints: 1 }, { maxUsePercent: 100 }]) {
    authorizedAxios.get.mockResolvedValue(envelope({ ...wallet, ...patch }))
    await expect(customerLoyaltyApi.balance()).rejects.toThrow('loyalty.invalidResponse')
  }
})

it('keeps signed ledger entries, zero events and debt, with server pagination', async () => {
  const list = [{ id: 'entry-1', orderId: 'order-1', kind: 'ReverseReward', pointsDelta: -1000, heldDelta: 0, netPointsAfter: -500, heldPointsAfter: 0, createdAt: '2026-11-15T00:00:00Z' }, { id: 'entry-2', orderId: null, kind: 'Opening', pointsDelta: 0, heldDelta: 0, netPointsAfter: 0, heldPointsAfter: 0, createdAt: '2026-11-14T00:00:00Z' }]
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, list, total: 21, currentPage: 2 } })
  expect(await customerLoyaltyApi.history(2)).toMatchObject({ list, totalPages: 2 })
  expect(authorizedAxios.get).toHaveBeenCalledWith('/customer/loyalty/history', { params: { page: 2, take: 20 }, signal: undefined })
  await expect(customerLoyaltyApi.history(0)).rejects.toThrow()
})

it('validates quote identity, exact points and cash split without calculating rewards locally', async () => {
  authorizedAxios.get.mockResolvedValue(envelope(quote))
  expect(await customerLoyaltyApi.quote('order-1', 36000)).toEqual(quote)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/customer/loyalty/quote/order-1', { params: { pointsToRedeem: 36000 }, signal: undefined })
  for (const patch of [{ orderId: 'other' }, { pointsToRedeem: 0 }, { maximumPoints: 1000 }, { cashAmount: 180000 }, { expectedEarnedPoints: .5 }, { isEstimate: false }]) {
    authorizedAxios.get.mockResolvedValue(envelope({ ...quote, ...patch }))
    await expect(customerLoyaltyApi.quote('order-1', 36000)).rejects.toThrow('loyalty.invalidResponse')
  }
  for (const points of [-1, .5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => customerLoyaltyApi.quote('order-1', points)).toThrow()
  }
})
