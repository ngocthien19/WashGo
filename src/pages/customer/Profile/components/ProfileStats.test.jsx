import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import ProfileStats from './ProfileStats'

it('shows three display-only statistics with actual reward points and colored borders', async () => {
  await i18n.changeLanguage('en')
  render(<ProfileStats profile={{ totalOrders: 14, totalSpent: 130000, loyaltyPoints: 1250 }} />)
  const label = screen.getByText(i18n.t('customer.profile.loyaltyPoints'))
  expect(within(label.parentElement).getByText('1,250')).toBeVisible()
  expect(screen.getAllByRole('term')).toHaveLength(3)
  for (const term of screen.getAllByRole('term')) {
    expect(term.closest('dl > div')).toHaveClass('border-l-4')
  }
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
