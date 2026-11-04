import i18n from './index'
import { LANGUAGE_OPTIONS } from '~/utils/constants'

const messageKeys = new Map()
const registerMessages = (messages, prefix = '') => {
  for (const [key, message] of Object.entries(messages)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (typeof message === 'string') {
      messageKeys.set(message.trim(), name)
    } else if (message && typeof message === 'object') {
      registerMessages(message, name)
    }
  }
}

for (const language of LANGUAGE_OPTIONS) {
  registerMessages(i18n.getResourceBundle(language.value, 'translation'))
}

export const resolveMessage = (message, values) => {
  if (!message) {
    return ''
  }
  const key = i18n.exists(message) ? message : messageKeys.get(String(message).trim())
  if (key) {
    return i18n.t(key, values)
  }
  // The API does not provide localized messages/codes yet. Never invent a translation.
  if (i18n.resolvedLanguage === 'vi' && /[À-ỹĐđ]/u.test(message)) {
    return message
  }
  return i18n.t('common.somethingWentWrongPleaseTryAgain')
}
