import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { TooltipProvider } from '~/components/ui/tooltip'
import ServiceDetails from './ServiceDetails'

describe('service details', () => {
  it('recovers after a request failure and displays full API information', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const load = vi.spyOn(customerCatalogApi, 'getService')
      .mockRejectedValueOnce(new Error('customer.unableToLoadDataPleaseTryAgain'))
      .mockResolvedValueOnce({
        id: 'service-1', name: 'Dịch vụ kiểm thử', code: 'SVC_TEST',
        serviceType: 2, unitPrice: 30000, unit: 'kg',
        estimatedDurationHours: 24, description: 'Mô tả đầy đủ từ API.'
      })
    render(
      <TooltipProvider>
        <ServiceDetails
          id="service-1"
          onClose={onClose}
        />
      </TooltipProvider>
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải dữ liệu')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(await dialog.findByRole('heading', { name: 'Dịch vụ kiểm thử' })).toBeVisible()
    expect(dialog.getByText('Mô tả đầy đủ từ API.')).toBeVisible()
    expect(dialog.getByText('SVC_TEST')).toBeVisible()
    expect(dialog.getByText('24 giờ')).toBeVisible()
    expect(load).toHaveBeenCalledTimes(2)
    await user.click(dialog.getByRole('button', { name: 'Đóng', exact: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
