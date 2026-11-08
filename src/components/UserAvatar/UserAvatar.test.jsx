import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it } from 'vitest'
import UserAvatar from './UserAvatar'

it('keeps an unassigned or unnamed person usable when the name is null', () => {
  render(<UserAvatar fullName={null} />)
  expect(screen.getByText('WG')).toBeVisible()
})
it('falls back to initials if a supplied image fails', () => {
  render(<UserAvatar
    avatar="/mock/avatar.png"
    fullName="Test Customer"
    alt="Customer avatar"
  />)
  fireEvent.error(screen.getByRole('img', { name: 'Customer avatar' }))
  expect(screen.getByText('TC')).toBeVisible()
})
