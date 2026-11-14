import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip'

export default function NavTooltip({ children, content, show, disabled = false, hoverClassName = '' }) {
  return (
    <Tooltip disabled={!show}>
      <TooltipTrigger render={(
        <span
          className={`flex w-full items-center justify-center ${hoverClassName}`}
          tabIndex={disabled ? 0 : undefined}
          aria-label={disabled ? content : undefined}
        >
          {children}
        </span>
      )}
      />
      <TooltipContent
        side="right"
        sideOffset={20}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
