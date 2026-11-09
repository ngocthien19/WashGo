import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import TablePagination from './TablePagination'

it('shows the actual last-page row range and retains pagination actions', async () => {
  await i18n.changeLanguage('en')
  const change = vi.fn()
  render(<TablePagination
    currentPage={2}
    totalPages={2}
    total={13}
    pageSize={12}
    rowCount={1}
    onPageChange={change}
  />)
  expect(screen.getByText(/13.?13\s*\/\s*13/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Previous page', exact: true }))
  expect(change).toHaveBeenCalledWith(1)
})

it('shows an empty range and no navigation when there are no results', async () => {
  await i18n.changeLanguage('en')
  render(<TablePagination
    currentPage={1}
    totalPages={0}
    total={0}
    pageSize={12}
    rowCount={0}
    onPageChange={vi.fn()}
  />)
  expect(screen.getByText(/0.?0\s*\/\s*0/)).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})
