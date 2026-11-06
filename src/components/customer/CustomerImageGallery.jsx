import { useTranslation } from 'react-i18next'
import { getImageUrl } from '~/utils/formats'

export default function CustomerImageGallery({ urls = [] }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {urls.map((url, index) => (
        <a
          key={url}
          href={getImageUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img
            src={getImageUrl(url)}
            alt={t('customer.imageUpload.alt', { count: index + 1 })}
            className="aspect-square w-full rounded-xl border border-border object-cover transition-opacity delay-0 duration-200 ease-out hover:opacity-85"
          />
        </a>
      ))}
    </div>
  )
}
