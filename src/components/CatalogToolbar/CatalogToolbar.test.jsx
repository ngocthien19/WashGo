import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import CatalogToolbar from './CatalogToolbar'

it('keeps a named search landmark and submits when the field label is visible', async () => {
  const user = userEvent.setup()
  const onSearch = vi.fn()
  render(<CatalogToolbar
    showLabel
    embedded
    keyword=""
    label="Search orders"
    onSearch={onSearch}
    loadSuggestions={async () => []}
  />)
  const search = screen.getByRole('search', { name: 'Search orders' })
  await user.type(screen.getByRole('combobox', { name: 'Search orders' }), 'WG123')
  await user.click(search.querySelector('button[type="submit"]'))
  expect(onSearch).toHaveBeenCalledWith('WG123')
})
