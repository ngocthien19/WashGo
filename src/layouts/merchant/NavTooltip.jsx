import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip'

export default function NavTooltip({ children, content, show, disabled = false, hoverClassName = '' }) {
  if (!show) {
    return hoverClassName ? (
      <span
        className={`flex w-full ${hoverClassName}`}
        title={disabled ? content : undefined}
      >
        {children}
      </span>
    ) : children
  }
  return (
    <Tooltip>
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
      <TooltipContent side="right">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
