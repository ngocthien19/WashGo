import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { cn } from '~/lib/utils'
import { UI_TRANSITIONS } from '~/utils/config/constants'

export function RadioGroup({ className, ...props }) {
  return (
    <RadioGroupPrimitive
      className={cn('grid gap-1', className)}
      {...props}
    />
  )
}

export function RadioGroupItem({ className, ...props }) {
  return (
    <Radio.Root
      className={cn('grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border border-foreground/45 bg-card text-primary outline-none data-checked:border-primary focus-visible:ring-3 focus-visible:ring-ring/25 data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:border-foreground/40', UI_TRANSITIONS.INPUT, className)}
      {...props}
    >
      <Radio.Indicator className="size-2.5 rounded-full bg-primary" />
    </Radio.Root>
  )
}
