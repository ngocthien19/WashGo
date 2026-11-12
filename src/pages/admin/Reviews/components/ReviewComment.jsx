import { useRef, useState } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip'

export default function ReviewComment({ children }) {
  const text = useRef(null)
  const [open, setOpen] = useState(false)
  return (
    <Tooltip
      open={open}
      onOpenChange={next => setOpen(next && !!text.current && text.current.scrollHeight > text.current.clientHeight + 1)}
    >
      <TooltipTrigger render={(
        <p
          ref={text}
          tabIndex={0}
          className="line-clamp-2 whitespace-pre-wrap break-words text-base leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-h-72 max-w-sm overflow-y-auto whitespace-pre-wrap break-words text-left text-sm">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
