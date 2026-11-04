import { useTranslation } from 'react-i18next'
import { resolveMessage } from '~/i18n/messages'

export default function LocalizedMessage({ message, values }) {
  useTranslation()
  return resolveMessage(message, values)
}
