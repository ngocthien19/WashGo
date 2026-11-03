import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '~/lib/utils'
import { UI_TRANSITIONS } from '~/utils/constants'

export function SelectField({ id, label, value, onValueChange, options, disabled, className }) {
  return (
    <SelectPrimitive.Root
      items={options}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={label}
        className={cn('flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-input bg-background px-3 text-left text-sm shadow-xs outline-none hover:border-primary/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50', UI_TRANSITIONS.INPUT, className)}
      >
        <SelectPrimitive.Value className="truncate" />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          alignItemWithTrigger={false}
          sideOffset={6}
          className="z-50"
        >
          <SelectPrimitive.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] min-w-40 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn('relative flex cursor-pointer items-center gap-2 rounded-lg py-2.5 pl-3 pr-9 text-sm outline-none data-highlighted:bg-muted data-selected:bg-primary/8 data-selected:font-semibold data-selected:text-primary', UI_TRANSITIONS.BUTTON)}
                >
                  <SelectPrimitive.ItemText className="break-words">
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 text-primary">
                    <Check size={15} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
