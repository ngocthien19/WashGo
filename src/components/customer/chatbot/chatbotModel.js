import { CHATBOT_CONFIG as CONFIG, CUSTOMER_ROUTES, ORDER_STATUS_OPTIONS, ORDER_STATUSES } from '~/utils/config/constants'

export const chatOrderStatusKey = (value) => {
  const name = Object.keys(ORDER_STATUSES).find((key) => key.replaceAll('_', '').toLowerCase() === String(value).toLowerCase())
  return name ? ORDER_STATUS_OPTIONS.find((option) => Number(option.value) === ORDER_STATUSES[name])?.label : null
}

export const mergeChatItems = (previous, incoming, prepend = false) => {
  const items = prepend ? [...incoming, ...previous] : [...previous, ...incoming]
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export const chatTurnErrorKey = (code) => ({
  AiNotConfigured: 'chatbot.aiNotConfigured',
  AiConfigurationRejected: 'chatbot.aiConnectionRejected',
  AiRateLimited: 'chatbot.aiRateLimited',
  AiTimeout: 'chatbot.aiTimeout',
  AiUnavailable: 'chatbot.aiUnavailable',
  ChatTurnExpired: 'chatbot.turnExpired',
  InvalidAiResponse: 'chatbot.aiInvalidResponse',
  InvalidAiToolCall: 'chatbot.aiInvalidResponse',
  ChatDataUnavailable: 'chatbot.dataUnavailable',
  ChatOrderNotFound: 'chatbot.orderNotFound'
}[code] || 'chatbot.failed')

export const chatErrorKey = (error) => {
  const body = error?.response?.data
  const code = body?.data?.errorCode || body?.meta?.code || body?.meta?.errorCode
  if (code === 'InvalidCursor') {
    return 'chatbot.cursorError'
  }
  if (code === 'SensitiveChatInput') {
    return 'chatbot.sensitiveError'
  }
  if (error?.response?.status === 429) {
    return 'chatbot.quotaError'
  }
  if ([401, 403].includes(error?.response?.status)) {
    return 'chatbot.authError'
  }
  if (error?.response?.status === 409) {
    return 'chatbot.busyError'
  }
  if (error?.response?.status === 400) {
    return 'chatbot.inputError'
  }
  if (code) {
    return chatTurnErrorKey(code)
  }
  return 'chatbot.requestError'
}

// Only application-owned destinations; never follow URLs supplied by the model.
export const chatCardDestination = (card) => {
  if (card.type === 'Order' && /^[0-9a-f-]{36}$/i.test(card.id)) {
    return CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', encodeURIComponent(card.id))
  }
  return null
}

export const messagesFromTurn = (turn, message) => {
  const customer = { id: turn.messageId, role: 1, content: message, requestId: turn.requestId, status: turn.status, errorCode: turn.errorCode }
  return turn.status === CONFIG.COMPLETED
    ? [customer, { id: `answer-${turn.requestId}`, role: 2, content: turn.answer, result: turn }]
    : [customer]
}
