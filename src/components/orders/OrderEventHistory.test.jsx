import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import OrderEventHistory from './OrderEventHistory'
import { milestoneEvents } from '~/utils/orders/orderEvents'
import { customerOrderView } from '~/apis/customer/customerOrderApi'
it('preserves server sequence despite clock differences and distinguishes assignment from status', async () => {
  await i18n.changeLanguage('en')
  const entries = [
    { id: 'a', eventType: 'Deposited', sequence: 1, basis: 'Captured', fromStatus: 1, status: 2, timestamp: 1794000000 },
    { id: 'b', eventType: 'MerchantAssigned', sequence: 2, basis: 'Captured', fromStatus: 2, status: 2, timestamp: 1793000000, merchantName: 'Captured shop' },
    { id: 'c', eventType: 'ShipperReassigned', sequence: 3, basis: 'Captured', fromStatus: 2, status: 2, taskType: 1, shipperName: 'New driver' }
  ]
  const { container } = render(<OrderEventHistory entries={entries} />)
  const rows = container.querySelectorAll('li')
  expect(rows[0]).toHaveTextContent('Dropped off')
  expect(rows[1]).toHaveTextContent('Shop assigned.')
  expect(rows[1]).toHaveTextContent('Captured shop')
  expect(rows[2]).toHaveTextContent('Shipper changed.')
  expect(container.querySelector('strong')).not.toBeInTheDocument()
  expect(screen.getByText(i18n.t('orderEvents.descriptions.Deposited'))).toBeVisible()
  expect(screen.getByText('Collection to shop')).toBeVisible()
  expect(milestoneEvents(entries).map(row => row.id)).toEqual(['a'])
  expect(entries[0].id).toBe('a')
})

it('keeps legacy notes and renders unknown events without inventing a transition', async () => {
  await i18n.changeLanguage('en')
  render(<OrderEventHistory entries={[
    { id: 'legacy', eventType: 'Legacy', basis: 'Legacy', status: 2, note: 'Original legacy note' },
    { id: 'future', eventType: 'FutureEvent', basis: 'Captured', status: 2, note: 'Server explanation' }
  ]}
  />)
  expect(screen.getByText('Original legacy note')).toBeVisible()
  expect(screen.queryByText('Order activity recorded')).not.toBeInTheDocument()
  expect(screen.getByText('Server explanation')).toBeVisible()
  expect(screen.queryByText('Assigned laundry shop')).not.toBeInTheDocument()
})

it('keeps a short event explanation alongside meaningful notes', async () => {
  await i18n.changeLanguage('en')
  render(<OrderEventHistory entries={[
    { id: 'reassigned', eventType: 'ShipperReassigned', basis: 'Captured', status: 3, fromStatus: 3, shipperName: 'Replacement driver', actorName: 'Admin', note: 'Original driver unavailable' },
    { id: 'weight', eventType: 'ActualWeightConfirmed', basis: 'Captured', status: 4, fromStatus: 3 }
  ]}
  />)
  expect(screen.getAllByText('Original driver unavailable')).toHaveLength(1)
  expect(screen.getByText('Replacement driver')).toBeVisible()
  expect(screen.getByText('Shipper changed.')).toBeVisible()
  expect(screen.getByText('Weight and price confirmed.')).toBeVisible()
})

it('keeps the creation explanation and avoids duplicate notes', async () => {
  await i18n.changeLanguage('en')
  render(<OrderEventHistory entries={[
    { id: 'created', eventType: 'OrderCreated', basis: 'Captured', status: 1, note: 'Awaiting drop-off.' }
  ]}
  />)
  expect(screen.getAllByText('Awaiting drop-off.')).toHaveLength(1)
  expect(screen.queryByText(i18n.t('orderEvents.labels.OrderCreated'))).not.toBeInTheDocument()
})

it('removes nested internal event snapshots from Customer responses', () => {
  const value = customerOrderView({ orderCode: 'WG1', storageLocation: 'Private', timeline: [{ status: 2, eventType: 'MerchantAssigned', merchantName: 'Private shop', shipperName: 'Private driver', previousShipperId: 'private-id', taskType: 1, storageCycleId: 'cycle', actorRole: 'Merchant', note: 'Private note' }] })
  expect(value.storageLocation).toBeUndefined()
  expect(value.timeline[0]).toEqual({ status: 2, eventType: 'MerchantAssigned', actorRole: 'Merchant', actorId: null, actorName: 'WashGo', note: null })
})

it('explains captured status transitions and keeps a missing previous status generic', async () => {
  await i18n.changeLanguage('en')
  render(<OrderEventHistory entries={[
    { id: 'drying', eventType: 'StatusChanged', basis: 'Captured', fromStatus: 4, status: 5 },
    { id: 'unknown-from', eventType: 'StatusChanged', basis: 'Captured', status: 6 }
  ]}
  />)
  expect(screen.getByText(i18n.t('orderEvents.transition', {
    from: i18n.t('customer.orders.status.WASHING'), to: i18n.t('customer.orders.status.DRYING')
  }))).toBeVisible()
  expect(screen.getByText('Status updated.')).toBeVisible()
})
