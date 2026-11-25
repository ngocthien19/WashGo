import { useTranslation } from 'react-i18next'
import { formatDateTime } from '~/utils/format/formats'

export default function CollectionWindow({ order }) {
  const { t } = useTranslation()
  if (!order?.collectionDeadlineState) {
    return null
  }
  const state = order.collectionDeadlineState
  return (
    <section
      className="space-y-2 rounded-xl border border-primary/20 bg-card p-4 text-sm"
      aria-label={t('collection.title')}
    >
      <h2 className="font-semibold">
        {t('collection.title')}
      </h2>
      <p>
        {t(`collection.state.${state}`, { defaultValue: t('collection.state.AwaitingMerchant') })}
      </p>
      {order.collectionStartsAt && (
        <p>
          {t('collection.start')}
          :
          {' '}
          <span className="font-medium">
            {formatDateTime(order.collectionStartsAt, 'Asia/Ho_Chi_Minh')}
          </span>
        </p>
      )}
      {order.collectionDeadlineAt && (
        <p>
          {t('collection.deadline')}
          :
          {' '}
          <span className="font-medium">
            {formatDateTime(order.collectionDeadlineAt, 'Asia/Ho_Chi_Minh')}
          </span>
        </p>
      )}
      {state !== 'Legacy' && Number.isFinite(order.collectSlaHoursSnapshot) && (
        <p>
          {t('collection.hours', { hours: order.collectSlaHoursSnapshot })}
        </p>
      )}
      {order.isCollectionOverdue && (
        <p
          role="alert"
          className="font-medium text-destructive"
        >
          {t('collection.overdue')}
        </p>
      )}
    </section>
  )
}
