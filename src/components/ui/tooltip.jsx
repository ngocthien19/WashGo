import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { useId, useState } from 'react'
import { cn } from '~/lib/utils'
import { UI_MOTION } from '~/utils/constants'

export function TooltipProvider({ children }) {
  return (
    <TooltipPrimitive.Provider delay={UI_MOTION.TOOLTIP_DELAY_MS}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({ children, side = 'top', sideOffset = 8, className, id }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        className="z-[100]"
      >
        <TooltipPrimitive.Popup
          id={id}
          role="tooltip"
          className={cn('max-w-64 rounded-lg bg-foreground px-3 py-2 text-center text-xs leading-5 text-background shadow-md', className)}
        >
          {children}
          <TooltipPrimitive.Arrow className="pointer-events-none size-2 rotate-45 bg-foreground data-[side=right]:-left-1 data-[side=left]:-right-1 data-[side=top]:-bottom-1 data-[side=bottom]:-top-1" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export function WithTooltip({ content, children, disabled = false }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <Tooltip
      open={open}
      onOpenChange={setOpen}
    >
      <TooltipTrigger
        aria-describedby={open ? id : undefined}
        render={disabled ? (
          <span
            tabIndex={0}
            className="inline-flex cursor-not-allowed"
            aria-label={content}
          >
            {children}
          </span>
        ) : children}
      />
      <TooltipContent id={id}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
