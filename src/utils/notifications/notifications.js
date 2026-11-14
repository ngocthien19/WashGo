import { createElement } from 'react'
import toast from 'react-hot-toast'
import { Info, TriangleAlert } from 'lucide-react'
import LocalizedMessage from '~/components/LocalizedMessage/LocalizedMessage'

const show = (type, message, values, options) => {
  const content = createElement(LocalizedMessage, { message, values })
  if (type === 'info' || type === 'warning') {
    return toast(content, {
      icon: createElement(type === 'info' ? Info : TriangleAlert, { className: `size-5 shrink-0 ${type === 'info' ? 'text-primary' : 'text-amber-500'}` }),
      ...options
    })
  }
  return toast[type](content, {
    ...(type === 'error' ? { ariaProps: { role: 'alert', 'aria-live': 'assertive' } } : {}),
    ...options
  })
}

export const notify = {
  success: (message, values, options) => show('success', message, values, options),
  error: (message, values, options) => show('error', message, values, options),
  info: (message, values, options) => show('info', message, values, options),
  warning: (message, values, options) => show('warning', message, values, options)
}
