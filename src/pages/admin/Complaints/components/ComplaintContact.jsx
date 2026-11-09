import { useTranslation } from 'react-i18next'
import { UserRound, Store, Mail, Phone } from 'lucide-react'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'

export default function ComplaintContact({ value, kind = 'customer' }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-start gap-3">
      <ResourceThumbnail
        urls={value.imageUrls}
        name={value.name}
        icon={kind === 'customer' ? UserRound : Store}
      />
      <div className="min-w-0 space-y-2">
        <p className="font-semibold">
          {value.name || '—'}
        </p>
        <p
          className="flex items-start gap-2 text-sm text-muted-foreground"
          aria-label={t('admin.complaints.contactEmail')}
        >
          <Mail
            size={15}
            className="mt-0.5 shrink-0"
          />
          <span className="break-all">
            {value.email || '—'}
          </span>
        </p>
        <p
          className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground"
          aria-label={t('admin.complaints.contactPhone')}
        >
          <Phone
            size={15}
            className="shrink-0"
          />
          {value.phone || '—'}
        </p>
      </div>
    </div>
  )
}
