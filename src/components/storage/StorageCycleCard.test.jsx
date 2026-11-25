import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import StorageCycleCard from './StorageCycleCard'

const row = { state: 4, currentLocation: 'InTransit', isCurrent: true, merchantName: 'Snapshot shop', shopAddress: 'Private address', storageReference: 'LK202611170900001234', referenceIssuedAt: '2026-11-17T02:00:00Z', receiptReference: 'PAPER-1', feeTotal: 0, feePaid: 0, outstanding: 0 }
it('identifies historical shop details while laundry is in transit', async () => {
  await i18n.changeLanguage('en')
  render(<StorageCycleCard
    row={row}
    role="Admin"
  />)
  expect(screen.getByText(/Storage details for this cycle, not the current location/)).toBeVisible()
  expect(screen.getByText(/LK202611170900001234/)).toBeVisible()
  expect(screen.getByText(/PAPER-1/)).toBeVisible()
  expect(screen.getByText(/In transit/)).toBeVisible()
})
it('does not expose internal custody fields to Customer', () => {
  render(<StorageCycleCard
    row={row}
    role="Customer"
  />)
  expect(screen.queryByText(/LK202611170900001234|Snapshot shop|Private address|PAPER-1/)).not.toBeInTheDocument()
})

it.each(['Admin', 'Customer'])('omits frozen cycle fee details for %s', async role => {
  await i18n.changeLanguage('en')
  render(<StorageCycleCard
    row={{ ...row, frozenLockerFee: 17000, frozenWarehouseFee: 23000 }}
    role={role}
  />)
  expect(screen.queryByText(i18n.t('storage.frozenLockerFee'))).not.toBeInTheDocument()
  expect(screen.queryByText(i18n.t('storage.frozenWarehouseFee'))).not.toBeInTheDocument()
  if (role === 'Admin') {
    expect(screen.getByText(i18n.t('storage.feeTotal'))).toBeVisible()
    expect(screen.getByText(i18n.t('storage.feePaid'))).toBeVisible()
    expect(screen.getByText(i18n.t('storage.outstanding'))).toBeVisible()
  }
})
