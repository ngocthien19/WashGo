import ResourceGallery from '~/components/ResourceThumbnail/ResourceGallery'
import { useTranslation } from 'react-i18next'
import { Banknote, Clock, Tags, Scale, Shirt } from 'lucide-react'
import { formatCurrency } from '~/utils/formats'
import { SERVICE_TYPES } from '~/utils/constants'

export default function ServiceInfo({ value }) {
  const { t } = useTranslation()
  const category = SERVICE_TYPES.find((item) => Number(item.value) === value.serviceType)?.label
  return (
    <div className="grid gap-4">
      <h3 className="break-words text-xl font-bold">
        {value.name}
      </h3>
      <ResourceGallery
        urls={value.imageUrls}
        imageLabel="merchant.services.image"
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ['unitPrice', Banknote, formatCurrency(value.unitPrice)], ['duration', Clock, t('merchant.services.hours', { count: value.estimatedDurationHours })],
          ['category', Tags, category ? t(category) : '—'], ['unit', Scale, value.unit || '—'],
          ['pricePerKg', Scale, formatCurrency(value.pricePerKg)], ['pricePerItem', Shirt, formatCurrency(value.pricePerItem)]
        ].map(([key, Icon, text]) => (
          <div
            key={key}
            className="flex min-w-0 gap-3 rounded-xl border border-border bg-muted/15 p-4"
          >
            <Icon
              size={18}
              className="mt-1 shrink-0 text-primary"
            />
            <div className="min-w-0">
              <dt className="text-sm text-muted-foreground">
                {t(`merchant.services.${key}`)}
              </dt>
              <dd className="mt-1 break-words text-base font-semibold">
                {text}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      {value.description && (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/30 p-4 text-base leading-relaxed">
          {value.description}
        </p>
      )}

    </div>
  )
}
