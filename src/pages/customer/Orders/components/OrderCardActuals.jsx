import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import useOrderRealtime from '~/hooks/useOrderRealtime'
import { formatNumber } from '~/utils/format/formats'

export default function OrderCardActuals({ order }) {
  const { t } = useTranslation()
  const liveRevision = useOrderRealtime(order.id)
  const load = useCallback(signal => Array.isArray(order.items)
    ? Promise.resolve({ items: order.items })
    : customerOrderApi.get(order.id, signal), [order.id, order.items])
  const resource = useCatalogResource(load, `${order.revision}:${liveRevision}`, true)
  const detail = resource.data
  const items = detail?.items || []
  const weight = detail?.actualWeightKg ?? order.actualWeightKg
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-xs text-muted-foreground">
        {t('actuals.cardTitle')}
      </p>
      {(weight != null || items.some(item => item.isWeightBased)) && (
        <div className="text-xs">
          <p className="text-muted-foreground">
            {t('actuals.orderWeight')}
          </p>
          <p className="text-sm font-bold">
            {weight != null ? `${formatNumber(weight)} kg` : t('actuals.unconfirmed')}
          </p>
        </div>
      )}
      {items.filter(item => !item.isWeightBased).map(item => (
        <div
          key={item.id}
          className="text-xs"
        >
          <p className="break-words text-muted-foreground">
            {item.serviceName}
          </p>
          <p className="text-sm font-bold">
            {item.actualQuantity == null ? t('actuals.unconfirmed') : `${formatNumber(item.actualQuantity)} ${t(`actuals.units.${['item', 'pair'].includes(item.unitSnapshot) ? item.unitSnapshot : 'unknown'}`)}`}
          </p>
        </div>
      ))}
      {!items.length && weight == null && <p className="text-sm font-bold">—</p>}
      {resource.error && (
        <button
          type="button"
          onClick={resource.retry}
          className="cursor-pointer text-xs text-primary hover:underline"
        >
          {t('actuals.retryCard')}
        </button>
      )}
    </div>
  )
}
