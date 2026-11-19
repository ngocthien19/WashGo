import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import CustomerImageStack from './CustomerImageStack'

it('shows two overlapping previews and a remaining count, then exposes all images', async () => {
  const user = userEvent.setup()
  render(<CustomerImageStack urls={['/one.png', '/two.png', '/three.png', '/four.png']} />)
  const button = screen.getByRole('button', { name: 'Xem 4 ảnh', exact: true })
  expect(button.querySelectorAll('img')).toHaveLength(2)
  expect(button).toHaveTextContent('2+')
  await user.click(button)
  const dialog = await screen.findByRole('dialog', { name: 'Ảnh đính kèm', exact: true })
  expect(within(dialog).getAllByRole('img')).toHaveLength(4)
  expect(within(dialog).getAllByRole('link')).toHaveLength(4)
  await user.click(within(dialog).getAllByRole('button', { name: 'Đóng', exact: true }).at(-1))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('keeps a single image accessible without a surplus badge and handles missing images', () => {
  const view = render(<CustomerImageStack urls={['/one.png']} />)
  expect(screen.getByRole('button', { name: 'Xem 1 ảnh', exact: true })).not.toHaveTextContent('+')
  view.rerender(<CustomerImageStack urls={[]} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('keeps the existing modal accessible after a stacked preview fails to load', async () => {
  const user = userEvent.setup()
  render(<CustomerImageStack urls={['/one.png', '/two.png', '/one.png', '', null]} />)
  const button = screen.getByRole('button', { name: 'Xem 2 ảnh', exact: true })
  fireEvent.error(button.querySelector('img'))
  expect(within(button).getByTitle('Không tải được ảnh')).toBeInTheDocument()
  await user.click(button)
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getAllByRole('link')).toHaveLength(2)
  expect(within(dialog).getAllByRole('link')[0]).toHaveAttribute('target', '_blank')
})
