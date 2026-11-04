import { createElement } from 'react'
import { toast } from 'react-toastify'
import LocalizedMessage from '~/components/LocalizedMessage/LocalizedMessage'

const show = (type, message, values, options) => toast[type](
  createElement(LocalizedMessage, { message, values }), options
)

export const notify = {
  success: (message, values, options) => show('success', message, values, options),
  error: (message, values, options) => show('error', message, values, options),
  info: (message, values, options) => show('info', message, values, options),
  warning: (message, values, options) => show('warning', message, values, options)
}
