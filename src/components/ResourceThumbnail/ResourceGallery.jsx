import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Images, ImageOff, ExternalLink } from 'lucide-react'
import { getImageUrl } from '~/utils/formats'

function GalleryPhoto({ url, alt }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div className="grid aspect-video place-content-center justify-items-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground">
      <ImageOff size={28} />
      {t('common.photoUnavailable')}
    </div>
  ) : (
    <a
      href={getImageUrl(url)}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-xl border border-border bg-muted focus-visible:ring-2 focus-visible:ring-primary"
    >
      <img
        src={getImageUrl(url)}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="aspect-video max-h-60 w-full object-cover transition-transform group-hover:scale-105 motion-reduce:transform-none"
      />
      <ExternalLink
        size={18}
        className="absolute right-2 top-2 rounded bg-card/90 p-1 text-primary size-7"
      />
    </a>
  )
}

export default function ResourceGallery({ urls = [], imageLabel }) {
  const { t } = useTranslation()
  const images = Array.isArray(urls) ? [...new Set(urls.filter((url) => typeof url === 'string' && url.trim()))] : []
  return (
    <section
      className="grid gap-3 rounded-2xl border border-primary/15 bg-primary/3 p-4"
      aria-label={t('common.photos')}
    >
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Images
          size={20}
          className="text-primary"
        />
        {t('common.photos')}
      </h3>
      {images.length ? (
        <div className={`grid gap-3 ${images.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {images.map((url, index) => (
            <GalleryPhoto
              key={url}
              url={url}
              alt={t(imageLabel, { number: index + 1 })}
            />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border py-8 text-base text-muted-foreground">
          <ImageOff size={30} />
          {t('common.noPhotos')}
        </div>
      )}
    </section>
  )
}
