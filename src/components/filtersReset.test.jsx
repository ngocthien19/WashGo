import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationFilters from './notifications/NotificationFilters'
import IncidentFilters from '~/pages/customer/Complaints/components/IncidentFilters'
import FinanceFilters from '~/pages/admin/Finance/components/FinanceFilters'
import { readQuery } from '~/pages/admin/Finance/financeModel'
import AuditPanel from '~/pages/admin/Audit/AuditPanel'
import { adminWorkspaceApi } from '~/apis/admin/adminWorkspaceApi'

vi.mock('~/apis/admin/adminWorkspaceApi', () => ({ adminWorkspaceApi: { activities: vi.fn() } }))

function UrlFilters({ Component, initial, onChange }) {
  const [params, setParams] = useState(new URLSearchParams(initial))
  return (
    <Component
      params={params}
      change={patch => {
        const next = new URLSearchParams(params)
        next.delete('page')
        Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
        onChange(Object.fromEntries(next))
        setParams(next)
      }}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  adminWorkspaceApi.activities.mockResolvedValue({ list: [], total: 0, currentPage: 1, totalPages: 0 })
})

describe('clear all filters', () => {
  it.each([
    ['notifications shared by all roles', NotificationFilters, { keyword: 'laundry', type: '1', sort: 'oldest', group: 'order', unread: 'true', page: '3' }, { group: 'order', unread: 'true' }],
    ['customer complaints', IncidentFilters, { keyword: 'damage', status: '1', type: '1', sort: 'status', page: '3' }, {}]
  ])('%s clears fields, sort and date drafts without clearing navigation scope', async (_, Component, initial, expected) => {
    const user = userEvent.setup(), changed = vi.fn()
    render(<UrlFilters
      Component={Component}
      initial={initial}
      onChange={changed}
    />)
    const from = screen.getByLabelText('Từ ngày')
    await user.type(from, '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Xóa tất cả', exact: true }))
    expect(changed).toHaveBeenLastCalledWith(expected)
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByLabelText('Từ ngày')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Xóa tất cả', exact: true })).not.toBeInTheDocument()
  })

  it.each(['revenue', 'settlements', 'refunds'])('finance %s returns to valid defaults and page one', async tab => {
    const user = userEvent.setup(), changed = vi.fn()
    const initial = readQuery(new URLSearchParams({ tab, keyword: 'invoice', merchantId: '11111111-1111-4111-8111-111111111111', status: '1', period: 'custom', from: '2026-10-01', to: '2026-10-10', listFrom: '2026-10-01', listTo: '2026-10-10', page: '4' }))
    function Finance() {
      const [query, setQuery] = useState(initial)
      return (
        <FinanceFilters
          query={query}
          merchants={{ data: [], loading: false }}
          onChange={patch => {
            changed(patch); setQuery(current => ({ ...current, ...patch, page: 1 }))
          }}
        />
      )
    }
    render(<Finance />)
    await user.click(screen.getByRole('button', { name: 'Xóa tất cả', exact: true }))
    expect(changed).toHaveBeenLastCalledWith(readQuery(new URLSearchParams({ tab })))
    expect(screen.queryByRole('button', { name: 'Xóa tất cả', exact: true })).not.toBeInTheDocument()
    if (tab !== 'revenue') {
      expect(screen.getByRole('searchbox')).toHaveValue('')
      expect(screen.getByLabelText('Từ ngày')).toHaveValue('')
    }
  })

  it('audit clears the form and pending date draft while retaining fixed complaint scope', async () => {
    const user = userEvent.setup()
    render(<AuditPanel
      autoApply
      resourceType="Incident"
      resourceId="incident-scope"
    />)
    await user.type(screen.getByLabelText('Từ khóa'), 'refund')
    await waitFor(() => expect(adminWorkspaceApi.activities).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'refund', resourceId: 'incident-scope' }), false, expect.any(AbortSignal)))
    await user.type(screen.getByLabelText('Từ ngày'), '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Xóa tất cả', exact: true }))
    expect(screen.getByLabelText('Từ khóa')).toHaveValue('')
    expect(screen.getByLabelText('Từ ngày')).toHaveValue('')
    await waitFor(() => expect(adminWorkspaceApi.activities).toHaveBeenLastCalledWith({ page: 1, take: 10, keyword: '', resourceType: 'Incident', resourceId: 'incident-scope' }, false, expect.any(AbortSignal)))
  })
})
