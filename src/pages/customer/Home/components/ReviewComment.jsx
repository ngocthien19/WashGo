import { useLayoutEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

export default function ReviewComment({ children }) {
  const ref = useRef(null)
  const [truncated, setTruncated] = useState(false)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    const node = ref.current
    let active = true
    const measure = () => {
      if (!active) {
        return
      }
      const clipped = node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
      setTruncated(clipped)
      if (!clipped) {
        setOpen(false)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    document.fonts?.ready.then(measure)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [children])

  return (
    <Tooltip
      open={truncated && open}
      onOpenChange={value => setOpen(value && truncated)}
    >
      <TooltipTrigger render={(
        <p
          ref={ref}
          tabIndex={truncated ? 0 : undefined}
          className="line-clamp-4 whitespace-pre-line break-words text-base leading-7 text-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {children}
        </p>
      )}
      />
      {truncated && (
        <TooltipContent className="max-w-[min(24rem,calc(100vw-2rem))] whitespace-pre-line break-words text-left text-sm leading-6">
          {children}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
