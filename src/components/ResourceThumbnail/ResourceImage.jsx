import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff } from 'lucide-react'
import { cn } from '~/lib/utils'

// Preserve the surrounding link/button and image dimensions when a URL fails.
export default function ResourceImage({ src, alt = '', className, loading = 'lazy', ...props }) {
  const { t } = useTranslation()
  const [failedSource, setFailedSource] = useState(null)
  if (!src || failedSource === src) {
    return (
      <span
        role="img"
        aria-label={alt ? `${alt}: ${t('common.photoUnavailable')}` : t('common.photoUnavailable')}
        title={t('common.photoUnavailable')}
        className={cn(className, 'grid place-items-center bg-muted text-muted-foreground')}
      >
        <ImageOff
          className="size-6"
          aria-hidden="true"
        />
      </span>
    )
  }
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailedSource(src)}
    />
  )
}
