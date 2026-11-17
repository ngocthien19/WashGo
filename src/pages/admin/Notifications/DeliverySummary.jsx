import { useTranslation } from 'react-i18next'
import { notificationApi } from '~/apis/notifications/notificationApi'
import { useNotifications } from '~/components/notifications/NotificationContext'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { formatDateTime } from '~/utils/format/formats'
import { Button } from '~/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function DeliverySummary() {
  const { t } = useTranslation()
  const { revision } = useNotifications()
  const resource = useCatalogResource(notificationApi.deliverySummary, revision)
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {t('notificationDelivery.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          disabled={resource.loading}
          onClick={resource.retry}
          aria-label={t('customer.orders.refresh')}
        >
          <RefreshCw size={18} />
        </Button>
      </div>
      {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : resource.data && (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            {['pending', 'sending', 'deadLetter'].map(key => (
              <div key={key}>
                <dt className="text-sm text-muted-foreground">
                  {t(`notificationDelivery.${key}`)}
                </dt>
                <dd className={`mt-1 text-xl font-bold ${key === 'deadLetter' && resource.data[key] > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {resource.data[key]}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {['oldestPendingAt', 'serverNow'].filter(key => resource.data[key]).map(key => (
              <p key={key}>
                {t(`notificationDelivery.${key}`)}
                :
                {' '}
                {formatDateTime(resource.data[key])}
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
