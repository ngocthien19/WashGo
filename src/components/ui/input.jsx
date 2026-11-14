import { cn } from '~/lib/utils'
import { UI_TRANSITIONS } from '~/utils/config/constants'

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none placeholder:text-muted-foreground enabled:hover:border-primary/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
        UI_TRANSITIONS.INPUT,
        className
      )}
      {...props}
    />
  )
}

export { Input }
