import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Images, ImageOff, ExternalLink } from 'lucide-react'
import { getImageUrl } from '~/utils/format/formats'

function GalleryPhoto({ url, alt, compact, thumbnails }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div className={`grid place-content-center justify-items-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground ${thumbnails ? 'h-28 w-32 p-2 text-center sm:w-36' : compact ? 'aspect-square' : 'aspect-video'}`}>
      <ImageOff size={28} />
      {t('common.photoUnavailable')}
    </div>
  ) : (
    <a
      href={getImageUrl(url)}
      target="_blank"
      rel="noreferrer"
      className={`group relative block overflow-hidden rounded-xl border border-border bg-muted focus-visible:ring-2 focus-visible:ring-primary ${thumbnails ? 'w-32 shrink-0 sm:w-36' : ''}`}
    >
      <img
        src={getImageUrl(url)}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${thumbnails ? 'h-28 object-contain' : compact ? 'aspect-square object-cover' : 'aspect-video max-h-60 object-cover'} w-full transition-transform group-hover:scale-105 motion-reduce:transform-none`}
      />
      <ExternalLink
        size={18}
        className="absolute right-2 top-2 rounded bg-card/90 p-1 text-primary size-7"
      />
    </a>
  )
}

export default function ResourceGallery({ urls = [], imageLabel, compact = false, thumbnails = false }) {
  const { t } = useTranslation()
  const images = Array.isArray(urls) ? [...new Set(urls.filter((url) => typeof url === 'string' && url.trim()))] : []
  return (
    <section
      className={compact ? 'max-h-48 w-24 shrink-0 overflow-y-auto rounded-xl sm:w-40' : 'grid gap-3 rounded-2xl border border-primary/15 bg-primary/3 p-4'}
      aria-label={t('common.photos')}
    >
      {!compact && (
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Images
            size={20}
            className="text-primary"
          />
          {t('common.photos')}
        </h3>
      )}
      {images.length ? (
        <div className={thumbnails ? 'flex flex-wrap gap-3' : `grid gap-3 ${!compact && images.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {images.map((url, index) => (
            <GalleryPhoto
              key={url}
              url={url}
              alt={t(imageLabel, { number: index + 1 })}
              compact={compact}
              thumbnails={thumbnails}
            />
          ))}
        </div>
      ) : (
        <div className={`grid place-content-center justify-items-center gap-2 rounded-xl border border-dashed border-border text-center text-muted-foreground ${thumbnails ? 'h-28 w-32 bg-muted/20 p-2 text-xs sm:w-36' : compact ? 'aspect-square bg-primary/5 p-2 text-xs' : 'py-8 text-base'}`}>
          <ImageOff size={30} />
          {t('common.noPhotos')}
        </div>
      )}
    </section>
  )
}
