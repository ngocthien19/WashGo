import { useTranslation } from 'react-i18next'
import { Mail, Phone, Store } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'

const text = value => typeof value === 'string' && value.trim() ? value.trim() : ''

export default function ReviewContact({ row, merchant = false }) {
  const { t } = useTranslation()
  const name = text(merchant ? row.merchantName : row.customerName)
  const email = text(merchant ? row.merchantEmail : row.customerEmail)
  const phone = text(merchant ? row.merchantPhone : row.customerPhoneNumber)
  return (
    <div className="flex min-w-0 items-start gap-3">
      {merchant ? (
        <ResourceThumbnail
          urls={row.merchantImageUrls}
          name={name || t('admin.reviews.merchantName')}
          icon={Store}
        />
      ) : (
        <UserAvatar
          avatar={text(row.customerAvatarUrl)}
          fullName={name}
          alt={name || t('admin.reviews.customerName')}
          className="size-16 text-lg"
        />
      )}
      <div className="min-w-0 space-y-1.5">
        <p className="break-words text-base font-semibold">
          {name || '—'}
        </p>
        <p className="flex items-start gap-2 text-sm font-normal text-muted-foreground">
          <Mail className="mt-0.5 size-4 shrink-0" />
          <span className="break-all">
            {email || '—'}
          </span>
        </p>
        <p className="flex items-start gap-2 text-sm font-normal text-muted-foreground">
          <Phone className="mt-0.5 size-4 shrink-0" />
          <span className="break-words">
            {phone || '—'}
          </span>
        </p>
      </div>
    </div>
  )
}
