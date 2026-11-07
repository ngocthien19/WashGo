import { useTranslation } from 'react-i18next'
import { formatDateTime } from '~/utils/formats'
import { statusTextColors } from '../orderSummary'
import { cn } from '~/lib/utils'


export default function OrderEstimate({ order, compact = false, loading = false, showEstimateLabel = false }) {
  const { t } = useTranslation()
  const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  const fallback = validDate(order.estimatedFinishAt) ? order.estimatedFinishAt : Number.isFinite(order.expectedDeliveryTime) && order.expectedDeliveryTime > 0 ? new Date(order.expectedDeliveryTime * 1000).toISOString() : null
  const status = order.predictionStatus || (fallback && order.status >= 1 && order.status <= 7 ? 'rule' : null)
  const date = validDate(order.predictedFinishAt) ? order.predictedFinishAt : status === 'rule' ? fallback : null
  return (
    <div className={compact ? 'mt-1 grid gap-1' : 'grid gap-2'}>
      <p className={cn(compact ? 'text-base font-bold' : 'text-lg font-semibold', statusTextColors[order.status] || 'text-foreground')}>
        {status === 'notApplicable' ? t('customer.sync.prediction.notApplicable') : date ? showEstimateLabel ? t('customer.sync.cardEstimatedAt', { date: formatDateTime(date) }) : formatDateTime(date) : t(loading ? 'customer.sync.etaLoading' : 'customer.sync.etaUnavailable')}
      </p>
      {['predicted', 'rule', 'done'].includes(status) && (
        <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
          {t(`customer.sync.${compact ? 'estimateLabels' : 'prediction'}.${status}`)}
        </p>
      )}
      {!compact && order.predictionUpdatedAt && (
        <p className="text-xs text-muted-foreground">
          {t('customer.sync.updatedAt', { date: formatDateTime(order.predictionUpdatedAt) })}
        </p>
      )}
    </div>
  )
}
