import { AlertCircle } from 'lucide-react'
import LocalizedMessage from '~/components/LocalizedMessage/LocalizedMessage'

export default function FormError({ children, inline = false, id }) {
  if (!children) {
    return null
  }
  if (inline) {
    return (
      <p
        id={id}
        role="alert"
        className="mt-1.5 text-xs leading-relaxed text-destructive"
      >
        {typeof children === 'string' ? <LocalizedMessage message={children} /> : children}
      </p>
    )
  }

  return (
    <div
      id={id}
      className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs leading-6 text-destructive"
      role="alert"
    >
      <AlertCircle
        size={18}
        className="mt-1 shrink-0"
      />
      <span>
        {typeof children === 'string' ? <LocalizedMessage message={children} /> : children}
      </span>
    </div>
  )
}
