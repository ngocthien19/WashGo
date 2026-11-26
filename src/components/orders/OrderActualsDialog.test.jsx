import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { orderManagementApi as api } from '~/apis/orders/orderManagementApi'
import OrderActualsDialog from './OrderActualsDialog'
import { OrderRealtimeContext } from '~/hooks/useOrderRealtime'
import { createOrderRealtimeStore } from '~/utils/orders/orderRealtime'
vi.mock('~/utils/notifications/notifications', () => ({ notify: { success: vi.fn() } }))
const order = { id: '11111111-1111-4111-8111-111111111111', orderCode: 'WG1', revision: 7, status: 3, paymentStatus: 1, finalAmount: 100000,
  allowedActions: { canConfirmActuals: true }, items: [
    { id: 'item', serviceName: 'Vest', quantity: 2, isWeightBased: false, unitSnapshot: 'item' },
    { id: 'pair', serviceName: 'Shoes', quantity: 1, isWeightBased: false, unitSnapshot: 'pair' },
    { id: 'kg', serviceName: 'Laundry package', quantity: 1, isWeightBased: true, unitSnapshot: 'kg' }
  ] }
const quote = { revision: 7, status: 3, previousFinalAmount: 100000, totalAmount: 150000, weightSurchargeAmount: 10000, discountAmount: 0, finalAmount: 160000,
  promotionRemoved: true, items: [{ orderItemId: 'item', amount: 90000 }, { orderItemId: 'pair', amount: 60000 }] }
beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(api, 'detail').mockResolvedValue(order)
  vi.spyOn(api, 'previewActuals').mockResolvedValue(quote)
  vi.spyOn(api, 'confirmActuals').mockResolvedValue({})
})
afterEach(() => vi.restoreAllMocks())
const fill = () => {
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Actual (items)' }), { target: { value: '3' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Actual weight (kg)' }), { target: { value: '5.25' } })
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Received an extra vest' } })
}
it('previews all mixed-service lines, warns about voucher loss and confirms server price after explicit checking', async () => {
  const saved = vi.fn()
  render(<OrderActualsDialog
    order={order}
    onClose={vi.fn()}
    onSaved={saved}
  />)
  fill()
  fireEvent.click(screen.getByRole('button', { name: 'Preview price' }))
  await screen.findByText(/The voucher no longer qualifies/)
  expect(api.previewActuals).toHaveBeenCalledWith(order.id, { actualWeightKg: 5.25, items: [{ orderItemId: 'item', actualQuantity: 3 }, { orderItemId: 'pair', actualQuantity: 1 }], note: 'Received an extra vest' })
  const confirm = screen.getByRole('button', { name: 'Confirm quantities and price' })
  expect(confirm).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(confirm)
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
  expect(api.confirmActuals).toHaveBeenCalledWith(order.id, expect.objectContaining({ expectedFinalAmount: 160000, actualWeightKg: 5.25 }), expect.objectContaining({ expectedRevision: 7, expectedStatus: 3, operationId: expect.any(String) }))
})
it('invalidates a preview when inputs change and validates integers and difference reasons before calling BE', async () => {
  render(<OrderActualsDialog
    order={order}
    onClose={vi.fn()}
    onSaved={vi.fn()}
  />)
  fill()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Actual (pairs)' }), { target: { value: '0.5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preview price' }))
  await screen.findByText('Enter an integer from 0 to 1,000.')
  expect(api.previewActuals).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Actual (pairs)' }), { target: { value: '1' } })
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preview price' }))
  await screen.findByText('Enter a reason when the quantity differs from the order.')
  fill(); fireEvent.click(screen.getByRole('button', { name: 'Preview price' }))
  await screen.findByText(/The voucher no longer qualifies/)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Actual (items)' }), { target: { value: '4' } })
  expect(screen.getByRole('button', { name: 'Confirm quantities and price' })).toBeDisabled()
  expect(api.confirmActuals).not.toHaveBeenCalled()
})
it('preserves typed values and blocks an open form when a realtime change arrives', async () => {
  const store = createOrderRealtimeStore()
  render(<OrderRealtimeContext.Provider value={store}>
    <OrderActualsDialog
      order={order}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />
  </OrderRealtimeContext.Provider>)
  fill()
  await act(async () => {
    store.revalidate()
    await new Promise(resolve => setTimeout(resolve, 250))
  })
  expect(screen.getByRole('button', { name: 'Preview price' })).toBeEnabled()
  await act(async () => {
    store.changed({ eventId: '22222222-2222-4222-8222-222222222222', orderId: order.id, revision: 8, changeType: 'StatusChanged', occurredAt: '2026-11-26T01:00:00Z' })
    await new Promise(resolve => setTimeout(resolve, 250))
  })
  expect(screen.getByRole('spinbutton', { name: 'Actual (items)' })).toHaveValue(3)
  expect(screen.getByRole('spinbutton', { name: 'Actual (items)' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Review updated order' })).toBeVisible()
  expect(api.confirmActuals).not.toHaveBeenCalled()
  store.dispose()
})
it('reopens an uncertain operation with its original submitted values and checks it without writing again', async () => {
  const saved = vi.fn()
  vi.spyOn(api, 'pendingActuals').mockReturnValue({ body: { actualWeightKg: 5.25, items: [{ orderItemId: 'item', actualQuantity: 3 }, { orderItemId: 'pair', actualQuantity: 1 }], note: 'Original reason', expectedFinalAmount: 160000 }, guard: { operationId: 'original' } })
  vi.spyOn(api, 'resolveActuals').mockResolvedValue({ resultRevision: 8 })
  render(<OrderActualsDialog
    order={order}
    onClose={vi.fn()}
    onSaved={saved}
  />)
  expect(screen.getByRole('spinbutton', { name: 'Actual (items)' })).toHaveValue(3)
  expect(screen.getByRole('spinbutton', { name: 'Actual (items)' })).toBeDisabled()
  expect(screen.getByRole('textbox')).toHaveValue('Original reason')
  fireEvent.click(screen.getByRole('button', { name: 'Check operation result' }))
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
  expect(api.confirmActuals).not.toHaveBeenCalled()
})
