import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerChatbotApi as api, readChatTurn } from './customerChatbotApi'
import { chatCardDestination, chatErrorKey, chatOrderStatusKey, chatTurnErrorKey } from '~/components/customer/chatbot/chatbotModel'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())

it('encodes signed cursors and uses the authenticated customer-only API', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { items: [], hasMore: false } } })
  await api.conversations('signed+/=')
  expect(authorizedAxios.get).toHaveBeenCalledWith('/customer/chatbot/conversations', { params: { take: 20, cursor: 'signed+/=' }, signal: undefined })
  await api.messages('conversation', 'older')
  expect(authorizedAxios.get.mock.calls[1][0]).toBe('/customer/chatbot/conversations/conversation/messages')
})

it('rejects a malformed page and leaves HTTP 503 payload available for turn recovery', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { items: [], hasMore: true } } })
  await expect(api.conversations()).rejects.toThrow('chatbot.invalidResponse')
  const error = { response: { status: 503, data: { data: { conversationId: 'c', status: 3 } } } }
  authorizedAxios.post.mockRejectedValue(error)
  await expect(api.send(null, { requestId: 'r', message: 'Question' })).rejects.toBe(error)
})

it('never maps model-provided URLs or unknown card types to navigation', () => {
  expect(chatCardDestination({ type: 'Link', id: 'https://evil.test' })).toBeNull()
  expect(chatCardDestination({ type: 'Order', id: '../admin' })).toBeNull()
  expect(chatCardDestination({ type: 'Order', id: '11111111-1111-1111-1111-111111111111', url: 'https://evil.test' })).toBe('/customer/orders/11111111-1111-1111-1111-111111111111')
  expect(readChatTurn({ status: 2, conversationId: 'c', messageId: 'm', requestId: 'wrong', answer: 'x' }, 'r')).toBeNull()
})

it('maps errors without exposing raw provider text', () => {
  expect(chatErrorKey({ response: { status: 429, data: { message: 'secret' } } })).toBe('chatbot.quotaError')
  expect(chatErrorKey({ response: { status: 400, data: { meta: { code: 'SensitiveChatInput' } } } })).toBe('chatbot.sensitiveError')
  expect(chatOrderStatusKey('ReadyToReturn')).toBe('customer.orders.status.READY_TO_RETURN')
  expect(chatOrderStatusKey('FakeStatus')).toBeNull()
  expect(chatTurnErrorKey('AiNotConfigured')).toBe('chatbot.aiNotConfigured')
  expect(chatTurnErrorKey('AiRateLimited')).toBe('chatbot.aiRateLimited')
  expect(chatTurnErrorKey('AiTimeout')).toBe('chatbot.aiTimeout')
  expect(chatTurnErrorKey('InvalidAiToolCall')).toBe('chatbot.aiInvalidResponse')
})
