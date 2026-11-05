import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import CreateOrderPage from './CreateOrderPage'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'

vi.mock('~/apis/customer/customerCatalogApi', () => ({ customerCatalogApi: { getServices: vi.fn(), getLockers: vi.fn(), getLocker: vi.fn() } }))
vi.mock('~/apis/customer/customerOrderApi', () => ({ customerOrderApi: { quote: vi.fn(), create: vi.fn() } }))
vi.mock('~/components/customer/lockers/LockerMap', () => ({ default: () => null }))
vi.mock('~/components/motion/Reveal', () => ({ default: ({ children }) => children }))

const service = { id: 'service', name: 'Test wash', unit: 'kg', unitPrice: 30000 }
const box = { id: 'box', slotNumber: 1, size: 2 }
const locker = { id: 'locker', name: 'Test locker', availableSlotCount: 1, availableSlots: [box] }
const baseQuote = { totalAmount: 30000, discountAmount: 0, finalAmount: 30000, availablePromotions: [] }
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const open = () => render(
  <MemoryRouter>
    <Routes>
      <Route element={<Outlet context={{ position: null, requestLocation: vi.fn() }} />}>
        <Route
          path="*"
          element={<CreateOrderPage />}
        />
      </Route>
    </Routes>
  </MemoryRouter>
)

const select = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Chọn Test wash' }))
  await user.click(screen.getByRole('button', { name: 'Tiếp tục', exact: true }))
  await user.click(await screen.findByRole('button', { name: /Test locker/ }))
  await user.click(await screen.findByRole('button', { name: 'Ô 1 Tiêu chuẩn' }))
}
const confirm = async (user) => {
  await select(user)
  await user.click(screen.getByRole('button', { name: 'Tiếp tục', exact: true }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận tạo đơn' })).toBeEnabled())
}

beforeEach(() => {
  vi.clearAllMocks()
  window.scrollTo = vi.fn()
  customerCatalogApi.getServices.mockResolvedValue({ list: [service], totalPages: 1 })
  customerCatalogApi.getLockers.mockResolvedValue({ list: [locker], totalPages: 1 })
  customerCatalogApi.getLocker.mockResolvedValue(locker)
  customerOrderApi.quote.mockResolvedValue(baseQuote)
  customerOrderApi.create.mockResolvedValue({ id: 'order', orderCode: 'WG123', lockerName: locker.name, boxNumber: 1, finalAmount: 30000, depositPinCode: '123456' })
})

describe('create order flow', () => {
  it('shows numbered steps and filters real slots without inventing occupied data', async () => {
    const user = userEvent.setup()
    customerCatalogApi.getLocker.mockResolvedValue({ ...locker, availableSlots: [box, { id: 'other-box', slotNumber: 2, size: 3 }] })
    open()
    const steps = screen.getByRole('list', { name: 'Các bước tạo đơn' })
    expect(steps).toHaveTextContent('1')
    expect(steps).toHaveTextContent('2')
    expect(steps).toHaveTextContent('3')
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Đang chọn', exact: true }))
    expect(screen.getByRole('button', { name: 'Ô 1 Tiêu chuẩn' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Ô 2 Lớn' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Đã có đồ', exact: true }))
    expect(screen.getByText('Thông tin ô đã có đồ đang được cập nhật. Bạn có thể chọn Trống để tiếp tục.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Ô 1 Tiêu chuẩn' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trống', exact: true }))
    expect(screen.getByRole('button', { name: 'Ô 2 Lớn' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ô 1 Tiêu chuẩn' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('revalidates availability, creates once and shows server confirmation', async () => {
    const user = userEvent.setup()
    const result = deferred()
    customerOrderApi.create.mockReturnValue(result.promise)
    open()
    expect(screen.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeDisabled()
    await confirm(user)
    await user.type(screen.getByRole('textbox', { name: /Ghi chú/ }), '  Handle carefully  ')
    const submit = screen.getByRole('button', { name: 'Xác nhận tạo đơn' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    await waitFor(() => expect(customerOrderApi.create).toHaveBeenCalledTimes(1))
    expect(customerOrderApi.create).toHaveBeenCalledWith({ lockerId: 'locker', boxId: 'box', returnLockerId: 'locker', paymentMethod: 1, customerNote: 'Handle carefully', promotionCode: null, items: [{ serviceId: 'service', quantity: 1 }] })
    result.resolve({ id: 'order', orderCode: 'WG123', lockerName: locker.name, boxNumber: 1, finalAmount: 29000, depositPinCode: '123456' })
    expect(await screen.findByRole('heading', { name: 'Tạo đơn thành công!' })).toBeVisible()
    expect(screen.getByText('WG123')).toBeVisible()
    expect(screen.queryByText('123456')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hiện mã PIN gửi đồ' }))
    expect(screen.getByText('123456')).toBeVisible()
  })

  it('stays at locker selection if the compartment disappeared', async () => {
    const user = userEvent.setup()
    open()
    await select(user)
    customerCatalogApi.getLocker.mockResolvedValue({ ...locker, availableSlots: [] })
    await user.click(screen.getByRole('button', { name: 'Tiếp tục', exact: true }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ô tủ vừa hết chỗ')
    expect(customerOrderApi.quote).not.toHaveBeenCalled()
    expect(customerOrderApi.create).not.toHaveBeenCalled()
  })

  it('blocks creating with an unapplied or rejected voucher, then allows clearing it', async () => {
    const user = userEvent.setup()
    open()
    await confirm(user)
    await user.type(screen.getByLabelText('Mã giảm giá'), 'BAD')
    expect(screen.getByRole('button', { name: 'Xác nhận tạo đơn' })).toBeDisabled()
    customerOrderApi.quote.mockRejectedValueOnce(new Error('customer.order.invalidPromotion'))
    await user.click(screen.getByRole('button', { name: 'Áp dụng / Cập nhật giá' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã giảm giá không tồn tại.')
    expect(screen.getByRole('button', { name: 'Xác nhận tạo đơn' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Bỏ mã giảm giá' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận tạo đơn' })).toBeEnabled())
  })

  it('ignores an old quote when a newer voucher request completes first', async () => {
    const user = userEvent.setup()
    const old = deferred()
    open()
    await confirm(user)
    customerOrderApi.quote.mockReturnValueOnce(old.promise)
    await user.type(screen.getByLabelText('Mã giảm giá'), 'OLD')
    await user.click(screen.getByRole('button', { name: 'Áp dụng / Cập nhật giá' }))
    await user.click(screen.getByRole('button', { name: 'Bỏ mã giảm giá' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận tạo đơn' })).toBeEnabled())
    await act(async () => old.resolve({ ...baseQuote, finalAmount: 1, appliedPromotion: { code: 'OLD' } }))
    await waitFor(() => expect(screen.queryByText('Đã áp dụng mã OLD')).not.toBeInTheDocument())
  })

  it('returns to compartment selection on a server conflict without losing services', async () => {
    const user = userEvent.setup()
    customerOrderApi.create.mockRejectedValue({ response: { status: 409, data: { message: 'customer.order.boxReserved' } } })
    open()
    await confirm(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo đơn' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ô này vừa được đặt.')
    expect(screen.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.getByRole('heading', { name: 'Dịch vụ đã chọn (1)' })).toBeVisible()
    expect(customerOrderApi.create).toHaveBeenCalledTimes(1)
  })

  it('does not automatically retry an ambiguous creation result', async () => {
    const user = userEvent.setup()
    customerOrderApi.create.mockRejectedValue({ isAxiosError: true })
    open()
    await confirm(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo đơn' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa xác định được kết quả tạo đơn')
    expect(screen.getByRole('button', { name: 'Xác nhận tạo đơn' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeDisabled()
    expect(customerOrderApi.create).toHaveBeenCalledTimes(1)
  })
})
