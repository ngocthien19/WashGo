import ScrollSection from '~/components/motion/ScrollSection'
import { lazy, Suspense, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Warehouse, CreditCard, MapPin } from 'lucide-react'
import { storageApi } from '~/apis/storage/storageApi'
import { customerCatalogApi, catalogImages } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import Pagination from '~/components/Pagination/Pagination'
import StorageActionDialog from '~/components/storage/StorageActionDialog'
import StorageCycleCard from '~/components/storage/StorageCycleCard'
import { Button } from '~/components/ui/button'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import PaymentSummary from '~/pages/customer/Payment/PaymentSummary'

const PaymentDialog = lazy(() => import('~/pages/customer/Payment/PaymentDialog'))
function ReturnRequest({ order, onUpdated }) {
  const { t } = useTranslation()
  const [historyPage, setHistoryPage] = useState(1)
  const [action, setAction] = useState(null), [paymentOpen, setPaymentOpen] = useState(false)
  const cycles = useCatalogResource(useCallback(signal => storageApi.cycles(order.id, historyPage, signal), [order.id, historyPage]), order.revision)
  const current = cycles.data?.list.find(row => row.canRequestReturn || row.canCancelReturn || row.isCurrent === true)
  const payment = useCatalogResource(useCallback(signal => customerPaymentApi.getSummary(order.id, 0, signal), [order.id]), order.revision)
  const summary = payment.data
  const targetId = summary?.returnLockerId || null
  const target = useCatalogResource(useCallback(signal => targetId ? customerCatalogApi.getLocker(targetId, signal) : Promise.resolve(null), [targetId]))
  const cycleRevision = current?.orderRevision
  const loadQuote = useCallback(signal => current?.canRequestReturn && Number.isSafeInteger(cycleRevision) && targetId && order.status === 13 ? storageApi.quote(order.id, targetId, signal) : Promise.resolve(null), [current?.canRequestReturn, cycleRevision, targetId, order.id, order.status])
  const quoteResource = useCatalogResource(loadQuote)
  const quote = quoteResource.data
  const pending = storageApi.hasPending(order.id)
  const done = () => {
    setAction(null); cycles.retry(); quoteResource.retry(); payment.retry(); onUpdated()
  }
  const payClosed = () => {
    setPaymentOpen(false); done()
  }
  return (
    <ScrollSection className="overflow-hidden rounded-2xl border border-teal-500/25 bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b border-teal-500/15 bg-teal-500/5 p-5 sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
          <Warehouse size={24} />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-bold">
            {t([13, 14, 15].includes(order.status) ? 'storage.customerTitle' : 'storage.history')}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t([13, 14, 15].includes(order.status) ? 'storageCustomer.hint' : 'storage.historyHint')}
          </p>
        </div>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        {current && (
          <section
            className="space-y-4 rounded-xl border bg-muted/20 p-4"
            aria-label={t('storageCustomer.balance')}
          >
            <h3 className="flex items-center gap-2 font-semibold">
              <CreditCard
                size={18}
                className="text-teal-600"
              />
              {t('storageCustomer.balance')}
            </h3>
            {payment.loading || payment.error ? <ResourceFeedback {...payment} /> : summary && (
              <>
                <PaymentSummary summary={summary} />
                {(summary.outstanding > 0 || summary.quote.activeSession) && (
                  <Button
                    className="h-12 rounded-xl px-6 text-base font-medium"
                    onClick={() => setPaymentOpen(true)}
                  >
                    {t('customer.orders.pay')}
                  </Button>
                )}
              </>
            )}
          </section>
        )}
        {targetId && (
          <section className="space-y-3 rounded-xl border border-teal-500/20 p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin
                size={18}
                className="text-teal-600"
              />
              {t('storage.returnStation')}
            </h3>
            {target.loading || target.error ? <ResourceFeedback {...target} /> : (
              <div className="flex items-start gap-3">
                <ResourceThumbnail
                  urls={catalogImages(target.data)}
                  name={target.data?.name}
                />
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold">
                    {target.data?.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {target.data?.address}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
        {cycles.loading || cycles.error ? <ResourceFeedback {...cycles} /> : (
          <div
            data-pagination-scope
            className="space-y-3"
          >
            {cycles.data.list.map(row => (
              <StorageCycleCard
                key={row.id}
                row={row}
                role="Customer"
              />
            ))}
            {!cycles.data.list.length && (
              <p>
                {t(order.storageWorkflowVersion === 0 ? 'storage.legacyCustomer' : 'storage.noCycles')}
              </p>
            )}
            {cycles.data.totalPages > 1 && (
              <Pagination
                currentPage={historyPage}
                totalPages={cycles.data.totalPages}
                onPageChange={setHistoryPage}
              />
            )}
          </div>
        )}
        {quoteResource.error && (
          <ResourceFeedback
            error={quoteResource.error}
            retry={quoteResource.retry}
          />
        )}
        {(pending || current?.canRequestReturn || current?.canCancelReturn) && (
          <div className="flex flex-wrap gap-3 border-t pt-4">
            {pending ? (
              <Button onClick={() => setAction('return-request')}>
                {t('admin.sync.checkResult')}
              </Button>
            ) : (
              <>
                {current?.canRequestReturn && (
                  <Button
                    disabled={!summary?.canRequestStorageReturn || payment.loading || !quote || quoteResource.loading || cycles.loading}
                    onClick={() => setAction('return-request')}
                  >
                    {t('storage.actions.return-request')}
                  </Button>
                )}
                {current?.canCancelReturn && (
                  <Button
                    variant="outline"
                    onClick={() => setAction('cancel-return')}
                  >
                    {t('storage.actions.cancel-return')}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {action && (
        <StorageActionDialog
          order={order}
          cycle={current}
          action={action}
          role="Customer"
          quote={action === 'return-request' ? quote : undefined}
          onClose={done}
          onSaved={done}
        />
      )}
      {paymentOpen && (
        <Suspense fallback={null}>
          <PaymentDialog
            orderId={order.id}
            onClose={payClosed}
          />
        </Suspense>
      )}
    </ScrollSection>
  )
}
export default function StoragePickup(props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if ([13, 14, 15].includes(props.order.status) || expanded) {
    return (
      <ReturnRequest
        key={props.order.id}
        {...props}
      />
    )
  }
  return props.order.storageWorkflowVersion >= 1 && [10, 11, 12, 99].includes(props.order.status) ? (
    <Button
      variant="outline"
      className="h-11"
      onClick={() => setExpanded(true)}
    >
      {t('storage.history')}
    </Button>
  ) : null
}
