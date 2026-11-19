import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import { ORDER_GROUPS } from '~/utils/orders/orderGroups'
import OrderSummary from './OrderSummary'

it('renders every summary group including the collection and return queues', async () => {
  await i18n.changeLanguage('en')
  render(<OrderSummary resource={{ data: { total: 4, counts: { 16: 1, 17: 1, 18: 1, 19: 1 } }, loading: false }} />)
  for (const group of ORDER_GROUPS) {
    expect(screen.getByRole('heading', { name: i18n.t(`merchant.groups.${group.key}`), exact: true })).toBeVisible()
  }
})
