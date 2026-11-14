import authorizedAxios from '~/utils/authorizedAxios'
import { CHATBOT_CONFIG as CONFIG } from '~/utils/constants'

const root = CONFIG.ENDPOINT
const segment = (value) => encodeURIComponent(value)
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data) {
    throw new Error('chatbot.invalidResponse')
  }
  return data.data
}
const page = (response) => {
  const value = unwrap(response)
  if (!Array.isArray(value.items) || typeof value.hasMore !== 'boolean' || value.hasMore && !value.nextCursor) {
    throw new Error('chatbot.invalidResponse')
  }
  return value
}
export const readChatTurn = (value, requestId, conversationId) => {
  if (!value?.conversationId || !value.messageId || value.requestId !== requestId
    || conversationId && value.conversationId !== conversationId
    || ![CONFIG.PROCESSING, CONFIG.COMPLETED, CONFIG.FAILED].includes(value.status)
    || value.status === CONFIG.COMPLETED && typeof value.answer !== 'string') {
    return null
  }
  return value
}

export const customerChatbotApi = {
  conversations: (cursor, signal) => authorizedAxios.get(root, {
    params: { take: CONFIG.CONVERSATION_TAKE, cursor: cursor || undefined }, signal
  }).then(page),
  messages: (id, cursor, signal) => authorizedAxios.get(`${root}/${segment(id)}/messages`, {
    params: { take: CONFIG.MESSAGE_TAKE, cursor: cursor || undefined }, signal
  }).then(page),
  send: (id, payload) => authorizedAxios.post(id ? `${root}/${segment(id)}/messages` : `${root}/first-message`, payload, {
    timeout: CONFIG.TIMEOUT_MS
  }).then(unwrap),
  lookup: (id, requestId) => authorizedAxios.get(`${root}/${segment(id)}/requests/${segment(requestId)}`).then(unwrap),
  remove: (id) => authorizedAxios.delete(`${root}/${segment(id)}`).then(({ data }) => {
    if (data?.succeeded !== true) {
      throw new Error('chatbot.invalidResponse')
    }
  })
}
