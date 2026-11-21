import { describe, expect, it } from 'vitest'
import reducer, { setSession, clearSession, updateCustomerIdentity } from './authSlice'

describe('customer identity synchronization', () => {
  const session = reducer(undefined, setSession({
    user: { id: 'customer-1', role: 'Customer', email: 'alex@example.test', fullName: 'Alex', avatar: null },
    accessToken: 'access', refreshToken: 'refresh'
  }))

  it('updates the header identity while preserving authorization and tokens', () => {
    const result = reducer(session, updateCustomerIdentity({
      id: 'customer-1', fullName: 'Alex Nguyen', phone: '0901234567', avatarUrl: '/uploads/avatar.png', role: 'Admin'
    }))
    expect(result.user).toEqual({
      ...session.user, fullName: 'Alex Nguyen', phone: '0901234567', avatar: '/uploads/avatar.png'
    })
    expect(result.accessToken).toBe('access')
    expect(result.refreshToken).toBe('refresh')
  })

  it('ignores responses for an account that is no longer signed in', () => {
    expect(reducer(session, updateCustomerIdentity({ id: 'other-account', fullName: 'Other' }))).toEqual(session)
    expect(reducer(undefined, updateCustomerIdentity({ id: 'customer-1' })).user).toBeNull()
    expect(reducer(undefined, updateCustomerIdentity({})).user).toBeNull()
  })
  it('clears identity and tokens while retaining only a safe sign-in notice', () => {
    const cleared = reducer(session, clearSession({ notice: 'locked' }))
    expect(cleared).toEqual({ user: null, accessToken: null, refreshToken: null, expiresAt: null, notice: 'locked' })
    expect(reducer(cleared, setSession(session))).toEqual(session)
    expect(reducer(session, clearSession({ signedOut: true }))).toMatchObject({ signedOut: true, accessToken: null })
  })
})
