import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '~/components/ui/tooltip'
import CatalogResultSummary from './CatalogResultSummary'

describe('shared catalog result summary', () => {
  it('removes only the selected badge and supports clearing all filters', async () => {
    const user = userEvent.setup()
    const remove = vi.fn()
    const clear = vi.fn()
    render(
      <TooltipProvider>
        <CatalogResultSummary
          title="3 dịch vụ tìm thấy"
          range="Hiển thị 1–3 / 3"
          sortControl={<button>Sắp xếp</button>}
          filters={[{ id: 'serviceType', label: 'Giặt thường' }, { id: 'price', label: 'Dưới 30.000 ₫' }]}
          onRemoveFilter={remove}
          onClearFilters={clear}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole('status')).toHaveTextContent('3 dịch vụ tìm thấy')
    const badges = within(screen.getByRole('group', { name: 'Bộ lọc đang chọn' }))
    await user.click(badges.getByRole('button', { name: 'Bỏ bộ lọc Dưới 30.000 ₫' }))
    expect(remove).toHaveBeenCalledExactlyOnceWith('price')
    expect(clear).not.toHaveBeenCalled()
    await user.click(badges.getByRole('button', { name: 'Xóa tất cả' }))
    expect(clear).toHaveBeenCalledOnce()
  })

  it('does not show clear controls when there are no active conditions', () => {
    render(<CatalogResultSummary title="Đang tải dịch vụ..." />)
    expect(screen.queryByRole('group', { name: 'Bộ lọc đang chọn' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xóa tất cả' })).not.toBeInTheDocument()
  })
})
