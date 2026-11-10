import { useTranslation } from 'react-i18next'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import { Button } from '~/components/ui/button'

export default function DeliveryLocker({ name, address, images = [], box, fallback, autoBox = false, onOpenMap }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ResourceThumbnail
        urls={images}
        name={name || fallback}
      />
      <div className="min-w-0 space-y-1">
        <p className="text-base font-semibold">
          {name || fallback || '—'}
        </p>
        {box && (
          <p className="text-sm text-muted-foreground">
            {t('customer.order.box', { number: box })}
          </p>
        )}
        {(address || onOpenMap) && (
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 break-words text-sm leading-6 text-muted-foreground">
              {address || '—'}
            </p>
            {onOpenMap && (
              <Button
                variant="link"
                className="h-auto shrink-0 self-start p-0 text-primary [&&]:text-sm hover:underline focus-visible:underline"
                onClick={onOpenMap}
              >
                {t('shipper.tasks.openMap')}
              </Button>
            )}
          </div>
        )}
        {autoBox && !box && (
          <p className="text-sm text-muted-foreground">
            {t('shipper.tasks.autoBox')}
          </p>
        )}
      </div>
    </div>
  )
}
