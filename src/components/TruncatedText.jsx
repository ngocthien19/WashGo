import { WithTooltip } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

export default function TruncatedText({ children, className }) {
  return (
    <WithTooltip content={children || '—'}>
      <span
        tabIndex={0}
        className={cn('block min-w-0 truncate', className)}
      >
        {children || '—'}
      </span>
    </WithTooltip>
  )
}
