import useOrderRealtime from '~/hooks/useOrderRealtime'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import { formatCurrency } from '~/utils/format/formats'
import { orderPaymentAmounts } from './combinedPaymentModel'
import PaymentSummary from './PaymentSummary'
const PaymentDialog = lazy(() => import('./PaymentDialog'))

export default function OrderPaymentAction({ order, onUpdated, autoOpen = false, onClose, compact = false, initialMethod, secondaryAction }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(autoOpen)
  const pending = useRef(new Set())
  const liveRevision = useOrderRealtime(order.id)
  const resource = useCatalogResource(useCallback(signal => customerPaymentApi.getSummary(order.id, 0, signal), [order.id]), `${order.revision}:${liveRevision}`, true)
  const summary = resource.data
  const amounts = summary ? orderPaymentAmounts(summary) : null
  const close = () => {
    setOpen(false); resource.retry(); onClose?.()
  }
  return (
    <div className={compact ? 'min-w-0 space-y-3' : 'space-y-5'}>
      {resource.error || resource.loading && !summary ? <ResourceFeedback {...resource} /> : summary && (
        <>
          {!compact ? (
            <PaymentSummary
              summary={summary}
              amounts={amounts.pointsToRedeem > 0 ? amounts : undefined}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t('combined.total')}
              </p>
              <p className="text-lg font-semibold tabular-nums text-primary">
                {formatCurrency(amounts.cashAmount)}
              </p>
            </>
          )}
          {!compact && summary.outstanding === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(summary.settled ? 'combined.settled' : 'combined.notDue')}
            </p>
          )}
        </>
      )}
      <div className={compact ? 'flex flex-wrap items-center justify-end gap-2' : ''}>
        {!resource.error && summary && (summary.outstanding > 0 || summary.quote.activeSession) && (
          <Button
            onClick={() => setOpen(true)}
            className={compact ? 'h-11 shrink-0 rounded-xl px-4 text-base' : 'h-12 w-full rounded-xl text-base font-medium'}
          >
            {t('customer.orders.pay')}
          </Button>
        )}
        {secondaryAction}
      </div>
      {open && (
        <Suspense fallback={null}>
          <PaymentDialog
            orderId={order.id}
            pendingRequests={pending}
            initialMethod={initialMethod}
            onClose={close}
            onUpdated={() => {
              resource.retry(); onUpdated?.()
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
