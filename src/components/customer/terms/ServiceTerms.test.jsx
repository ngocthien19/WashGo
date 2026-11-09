import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { customerPolicyApi } from '~/apis/customer/customerPolicyApi'
import ServiceTerms from './ServiceTerms'

vi.mock('~/apis/customer/customerPolicyApi', () => ({ customerPolicyApi: { get: vi.fn(), acknowledge: vi.fn() } }))
const policy = (accepted = false, version = 'v1') => ({ terms: { version, title: 'Terms', content: 'Server policy content', effectiveFrom: '2026-11-01T00:00:00Z' }, rules: { depositWindowMinutes: 45, cancelLatePendingPercent: 20, cancelDepositedPercent: 30, cancelCollectedPercent: 50 }, accepted, requiresAcceptance: !accepted, acceptedVersion: accepted ? version : null })
const content = (id = 'a') => (
  <ServiceTerms key={id}>
    {(open) => <button onClick={open}>Footer terms</button>}
  </ServiceTerms>
)
beforeEach(async () => {
  vi.clearAllMocks(); await i18n.changeLanguage('en')
})
it('closing does not acknowledge; explicit acceptance posts the displayed version and survives another mount', async () => {
  const user = userEvent.setup()
  let accepted = false
  customerPolicyApi.get.mockImplementation(async () => policy(accepted))
  customerPolicyApi.acknowledge.mockImplementation(async () => {
    accepted = true; return policy(true)
  })
  const view = render(content())
  await screen.findByRole('dialog', { name: 'Terms', exact: true })
  await waitFor(() => expect(screen.getByText('Server policy content')).toBeVisible())
  await user.click(screen.getAllByRole('button', { name: 'Close', exact: true }).at(-1))
  expect(customerPolicyApi.acknowledge).not.toHaveBeenCalled()
  view.rerender(content('b'))
  await screen.findByRole('dialog', { name: 'Terms', exact: true })
  expect(screen.getByRole('button', { name: 'I agree to the terms' })).toBeDisabled()
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'I agree to the terms' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(customerPolicyApi.acknowledge).toHaveBeenCalledExactlyOnceWith('v1')
  view.rerender(content('c'))
  await user.click(screen.getByRole('button', { name: 'Footer terms' }))
  await screen.findByText('Server policy content')
  expect(screen.queryByRole('button', { name: 'I agree to the terms' })).not.toBeInTheDocument()
})
it('an acknowledgement failure keeps the version available for checking, without accepting locally', async () => {
  customerPolicyApi.get.mockResolvedValue(policy())
  customerPolicyApi.acknowledge.mockRejectedValue(new Error('Server unavailable'))
  render(content())
  await userEvent.click(await screen.findByRole('checkbox'))
  await userEvent.click(screen.getByRole('button', { name: 'I agree to the terms' }))
  await screen.findByRole('alert')
  await waitFor(() => expect(screen.getByRole('button', { name: 'I agree to the terms' })).toBeEnabled())
})
