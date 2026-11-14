import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'
import { UI_TRANSITIONS } from '~/utils/config/constants'

export function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn('grid size-5 shrink-0 cursor-pointer place-items-center rounded-md border border-foreground/50 bg-card outline-none data-checked:border-primary data-checked:bg-primary data-checked:text-white focus-visible:ring-3 focus-visible:ring-ring/25 data-disabled:cursor-not-allowed data-disabled:opacity-50', UI_TRANSITIONS.INPUT, className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
