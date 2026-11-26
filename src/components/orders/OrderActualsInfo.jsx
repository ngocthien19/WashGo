import { useTranslation } from 'react-i18next'
import { formatDateTime } from '~/utils/format/formats'

export default function OrderActualsInfo({ order }) {
  const { t } = useTranslation()
  if (!order.actualsConfirmedAt) {
    return null
  }
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 text-sm">
      <p className="font-medium text-teal-700 dark:text-teal-300">
        {t('actuals.confirmedAt', { date: formatDateTime(order.actualsConfirmedAt) })}
      </p>
      {order.actualsNote && (
        <p className="break-words text-muted-foreground">
          {order.actualsNote}
        </p>
      )}
    </div>
  )
}
