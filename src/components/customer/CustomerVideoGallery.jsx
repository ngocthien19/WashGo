import { useTranslation } from 'react-i18next'
import { getImageUrl } from '~/utils/format/formats'
export default function CustomerVideoGallery({ urls = [] }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {urls.map((url, index) => (
        <video
          key={url}
          controls
          preload="metadata"
          playsInline
          src={getImageUrl(url)}
          aria-label={t('customer.sync.videoNumber', { number: index + 1 })}
          className="aspect-video w-full rounded-xl border border-border bg-black"
        />
      ))}
    </div>
  )
}
