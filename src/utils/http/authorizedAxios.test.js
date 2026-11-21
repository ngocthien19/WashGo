import axios from 'axios'
import { beforeEach, expect, it, vi } from 'vitest'
import client, { configureAxiosSession } from './authorizedAxios'

let auth
let clear
const failure = (config, status, data = {}) => Promise.reject(new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, { status, data, config }))
beforeEach(() => {
  auth = { accessToken: 'access', refreshToken: 'refresh' }
  clear = vi.fn(() => {
    auth = null
  })
  configureAxiosSession({ getAuth: () => auth, clearSession: clear, setSession: vi.fn() })
})

it.each(['Customer', 'Merchant', 'Shipper', 'Admin'])('ends an explicitly locked %s session without refreshing', async role => {
  auth.user = { role }
  const refresh = vi.spyOn(axios, 'post')
  await expect(client.get('/private', { adapter: config => failure(config, 401, { meta: { code: 'AccountLocked' } }) })).rejects.toBeTruthy()
  expect(clear).toHaveBeenCalledWith('locked', null)
  expect(refresh).not.toHaveBeenCalled()
})

it('does not sign out for ordinary permission denials or failed public sign-in', async () => {
  await expect(client.get('/private', { adapter: config => failure(config, 403, { meta: { code: 'Forbidden' } }) })).rejects.toBeTruthy()
  await expect(client.post('/auth/login', {}, { skipAuth: true, adapter: config => failure(config, 400, { meta: { code: 'AccountLocked' } }) })).rejects.toBeTruthy()
  expect(clear).not.toHaveBeenCalled()
})

it.each(['AccountLocked', 'AccountDeleted'])('preserves the account-facing reason from a signed-token %s response', async code => {
  const refresh = vi.spyOn(axios, 'post')
  await expect(client.get('/private', { adapter: config => failure(config, 401, { meta: { code, accountAccessReason: 'Reason for the account owner' } }) })).rejects.toBeTruthy()
  expect(clear).toHaveBeenCalledWith(code === 'AccountLocked' ? 'locked' : 'deleted', 'Reason for the account owner')
  expect(refresh).not.toHaveBeenCalled()
})

it.each(['SessionRevoked', 'SessionExpired', 'InvalidToken'])('ends %s without attempting to renew the invalid session', async code => {
  const refresh = vi.spyOn(axios, 'post')
  await expect(client.get('/private', { adapter: config => failure(config, 401, { meta: { code, accountAccessReason: 'Not a lock reason' } }) })).rejects.toBeTruthy()
  expect(clear).toHaveBeenCalledWith('sessionEnded', null)
  expect(refresh).not.toHaveBeenCalled()
})

it('uses a neutral session notice when refresh is revoked without a lock reason', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 400, data: { message: 'Invalid refresh token' } } })
  await expect(client.get('/private', { adapter: config => failure(config, 401) })).rejects.toBeTruthy()
  expect(clear).toHaveBeenCalledWith('sessionEnded', null)
})

it('keeps the session on a network failure while refreshing', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue(new axios.AxiosError('Network error', 'ERR_NETWORK'))
  await expect(client.get('/private', { adapter: config => failure(config, 401) })).rejects.toBeTruthy()
  expect(clear).not.toHaveBeenCalled()
})

it('shares a successful refresh between concurrent requests and retries with the new token', async () => {
  let resolveRefresh
  const refresh = vi.spyOn(axios, 'post').mockImplementation(() => new Promise(resolve => {
    resolveRefresh = resolve
  }))
  const save = vi.fn(data => {
    auth = data
  })
  configureAxiosSession({ getAuth: () => auth, clearSession: clear, setSession: save })
  const adapter = config => config.headers.Authorization === 'Bearer access'
    ? failure(config, 401, { meta: { code: 'TokenExpired' } })
    : Promise.resolve({ config, status: 200, data: { ok: true } })
  const first = client.get('/first', { adapter })
  const second = client.get('/second', { adapter })
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  resolveRefresh({ data: { succeeded: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } } })
  expect((await Promise.all([first, second])).map(response => response.data.ok)).toEqual([true, true])
  expect(save).toHaveBeenCalledTimes(1)
  expect(clear).not.toHaveBeenCalled()
})

it('does not clear a newly signed-in session because an old request fails', async () => {
  await expect(client.get('/private', { adapter: config => {
    auth = { accessToken: 'new-access', refreshToken: 'new-refresh' }
    return failure(config, 403, { meta: { code: 'AccountLocked' } })
  } })).rejects.toBeTruthy()
  expect(clear).not.toHaveBeenCalled()
})
