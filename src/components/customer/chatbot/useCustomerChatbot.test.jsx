import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { customerChatbotApi as api } from '~/apis/customer/customerChatbotApi'
import useCustomerChatbot from './useCustomerChatbot'

vi.mock('~/apis/customer/customerChatbotApi', async (original) => ({
  ...await original(), customerChatbotApi: { send: vi.fn(), lookup: vi.fn(), messages: vi.fn(), conversations: vi.fn(), remove: vi.fn() }
}))
beforeEach(() => vi.resetAllMocks())
const completed = (payload, overrides = {}) => ({ conversationId: 'conversation', messageId: 'message', requestId: payload.requestId, status: 2, answer: 'Verified answer', ...overrides })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('shows the configuration failure from envelope metadata while preserving the failed turn IDs', async () => {
  api.send.mockImplementation((id, payload) => Promise.reject({ response: { status: 503, data: {
    meta: { code: 'AiNotConfigured' }, data: completed(payload, { status: 3, answer: null })
  } } }))
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Question', {}))
  await waitFor(() => expect(result.current.error).toBe('chatbot.aiNotConfigured'))
  expect(result.current.conversationId).toBe('conversation')
  expect(result.current.pending).toBeNull()
  expect(api.send).toHaveBeenCalledTimes(1)
})

it('keeps rejected text available for editing without an automatic quota retry', async () => {
  api.send.mockRejectedValue({ response: { status: 429 } })
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Keep my question', {}))
  await waitFor(() => expect(result.current.error).toBe('chatbot.quotaError'))
  expect(result.current.retryMessage).toBe('Keep my question')
  expect(result.current.pending).toBeNull()
  expect(api.send).toHaveBeenCalledTimes(1)
})

it('does not apply an in-flight response after the customer widget is unmounted', async () => {
  const response = deferred()
  api.send.mockReturnValue(response.promise)
  const { result, unmount } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Private question', {}))
  unmount()
  await act(async () => response.resolve(completed(api.send.mock.calls[0][1])))
  expect(api.lookup).not.toHaveBeenCalled()
  expect(api.send).toHaveBeenCalledTimes(1)
})

it('creates no records until send, blocks double submission and displays only the matching answer', async () => {
  const response = deferred()
  api.send.mockReturnValue(response.promise)
  const { result } = renderHook(useCustomerChatbot)
  expect(api.conversations).not.toHaveBeenCalled()
  expect(api.send).not.toHaveBeenCalled()
  act(() => {
    result.current.send('Question', {}); result.current.send('Duplicate', {})
  })
  expect(api.send).toHaveBeenCalledTimes(1)
  await act(async () => response.resolve(completed(api.send.mock.calls[0][1])))
  expect(result.current.pending).toBeNull()
  expect(result.current.messages.items.map((message) => message.content)).toEqual(['Question', 'Verified answer'])
})

it('keeps first-message payload and request ID after timeout, with explicit replay to the original endpoint', async () => {
  api.send.mockRejectedValueOnce(new Error('timeout')).mockImplementationOnce((id, payload) => Promise.resolve(completed(payload)))
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Near me', { location: { latitude: 10, longitude: 106 } }))
  await waitFor(() => expect(result.current.error).toBe('chatbot.unknown'))
  expect(api.send).toHaveBeenCalledTimes(1)
  act(() => result.current.selectConversation(null))
  expect(result.current.pending).not.toBeNull()
  await act(async () => result.current.check())
  expect(api.send.mock.calls[1]).toEqual(api.send.mock.calls[0])
  expect(api.lookup).not.toHaveBeenCalled()
  expect(result.current.conversations.items).toHaveLength(1)
})

it('preserves turn data on HTTP 503 and uses a new request ID only after explicit new send', async () => {
  api.send.mockImplementationOnce((id, payload) => Promise.reject({ response: { status: 503, data: { data: completed(payload, { status: 3, answer: null, errorCode: 'AiUnavailable' }) } } }))
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Question', {}))
  await waitFor(() => expect(result.current.error).toBe('chatbot.aiUnavailable'))
  expect(result.current.conversationId).toBe('conversation')
  expect(result.current.pending).toBeNull()
  api.send.mockImplementation((id, payload) => Promise.resolve(completed(payload)))
  await act(async () => result.current.send('Question', {}))
  expect(api.send.mock.calls[1][1].requestId).not.toBe(api.send.mock.calls[0][1].requestId)
})

it('lookup 404 does not unlock a processing turn or cause an automatic resend', async () => {
  api.send.mockImplementation((id, payload) => Promise.resolve(completed(payload, { status: 1, answer: null })))
  api.lookup.mockRejectedValue({ response: { status: 404 } })
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Question', {}))
  await waitFor(() => expect(result.current.error).toBe('chatbot.processing'))
  await act(async () => result.current.check())
  expect(result.current.error).toBe('chatbot.unknown')
  act(() => result.current.send('Do not send', {}))
  expect(api.send).toHaveBeenCalledTimes(1)
  expect(result.current.pending).not.toBeNull()
  await act(async () => result.current.replay())
  expect(api.send.mock.calls[1]).toEqual(api.send.mock.calls[0])
})

it('restores processing turns from history for lookup without reconstructing context or resending', async () => {
  api.messages.mockResolvedValue({ items: [{ id: 'm1', role: 1, content: 'Question', status: 1, requestId: 'request' }], hasMore: false })
  api.lookup.mockResolvedValue(completed({ requestId: 'request' }))
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.selectConversation('conversation'))
  await waitFor(() => expect(result.current.pending?.lookupOnly).toBe(true))
  await act(async () => result.current.replay())
  expect(api.send).not.toHaveBeenCalled()
  await act(async () => result.current.check())
  expect(api.lookup).toHaveBeenCalledWith('conversation', 'request')
  expect(result.current.pending).toBeNull()
})

it('ignores a mismatched turn response and keeps the original attempt unresolved', async () => {
  api.send.mockImplementation((id, payload) => Promise.resolve(completed(payload, { requestId: 'wrong' })))
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.send('Question', {}))
  await waitFor(() => expect(result.current.error).toBe('chatbot.unknown'))
  expect(result.current.messages.items.some((message) => message.role === 2)).toBe(false)
})

it('deduplicates cursor pages and preserves history on a load error', async () => {
  api.conversations.mockResolvedValueOnce({ items: [{ id: 'c1' }], hasMore: true, nextCursor: 'signed' })
    .mockResolvedValueOnce({ items: [{ id: 'c1' }, { id: 'c2' }], hasMore: true, nextCursor: 'next' })
    .mockRejectedValueOnce({ response: { status: 400, data: { meta: { code: 'InvalidCursor' } } } })
  const { result } = renderHook(useCustomerChatbot)
  await act(async () => result.current.loadHistory())
  await act(async () => result.current.loadHistory('signed'))
  await act(async () => result.current.loadHistory('next'))
  expect(result.current.conversations.items.map((item) => item.id)).toEqual(['c1', 'c2'])
  expect(result.current.historyError).toBe('chatbot.cursorError')
})

it('prepends older messages in server order and removes only the confirmed conversation', async () => {
  api.messages.mockResolvedValueOnce({ items: [{ id: 'm2', role: 2 }], hasMore: true, nextCursor: 'older' })
    .mockResolvedValueOnce({ items: [{ id: 'm1', role: 1 }], hasMore: false })
  api.remove.mockResolvedValue()
  const { result } = renderHook(useCustomerChatbot)
  act(() => result.current.selectConversation('conversation'))
  await waitFor(() => expect(result.current.loadingMessages).toBe(false))
  await act(async () => result.current.loadMessages('conversation', 'older'))
  expect(result.current.messages.items.map((message) => message.id)).toEqual(['m1', 'm2'])
  await act(async () => result.current.remove('conversation'))
  expect(api.remove).toHaveBeenCalledWith('conversation')
  expect(result.current.conversationId).toBeNull()
  expect(result.current.messages.items).toEqual([])
})
