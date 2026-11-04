import { useState } from 'react'
import { cn } from '~/lib/utils'
import { getImageUrl, getInitials } from '~/utils/formats'

export default function CustomerAvatar({ avatar, fullName, className, alt = '' }) {
  const [failedSource, setFailedSource] = useState('')
  const source = getImageUrl(avatar)
  if (source && source !== failedSource) {
    return (
      <img
        src={source}
        alt={alt}
        className={cn('size-8 shrink-0 rounded-full object-cover', className)}
        onError={() => setFailedSource(source)}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn('grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary', className)}
    >
      {getInitials(fullName)}
    </span>
  )
}
