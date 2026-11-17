import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Sparkles, History } from 'lucide-react'
import { customerLoyaltyApi } from '~/apis/customer/customerLoyaltyApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import { Button } from '~/components/ui/button'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'
import { formatNumber, formatDateTime } from '~/utils/format/formats'

export default function LoyaltyWallet() {
  const { t } = useTranslation()
  const titleId = useId()
  const [showHistory, setShowHistory] = useState(false)
  const [page, setPage] = useState(1)
  const balance = useCatalogResource(customerLoyaltyApi.balance)
  const history = useCatalogResource(useCallback(signal => showHistory ? customerLoyaltyApi.history(page, signal) : Promise.resolve(null), [page, showHistory]))
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 p-5 sm:px-7">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-lg font-bold"
        >
          <Sparkles className="size-5 text-primary" />
          {t('loyalty.title')}
        </h2>
        <Button
          variant="outline"
          className="h-11"
          disabled={balance.loading || history.loading}
          onClick={() => {
            balance.retry(); history.retry()
          }}
        >
          <RefreshCw size={16} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      <div className="space-y-5 p-5 sm:p-7">
        {balance.loading || balance.error ? <ResourceFeedback {...balance} /> : balance.data && (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {['availablePoints', 'heldPoints', 'totalPoints', 'debtPoints'].map(key => (
                <div
                  key={key}
                  className={`rounded-2xl border p-4 ${key === 'availablePoints' ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'}`}
                >
                  <dt className="text-sm text-muted-foreground">
                    {t(`loyalty.${key}`)}
                  </dt>
                  <dd className="mt-2 break-words text-2xl font-bold tabular-nums">
                    {formatNumber(balance.data[key])}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('loyalty.policy', { earn: balance.data.earnPercent, maximum: balance.data.maxUsePercent })}
            </p>
            {balance.data.debtPoints > 0 && (
              <p className="rounded-xl bg-amber-500/10 p-4 text-sm">
                {t('loyalty.debtHint')}
              </p>
            )}
          </>
        )}
        <Button
          variant="outline"
          className="h-11"
          aria-expanded={showHistory}
          onClick={() => setShowHistory(value => !value)}
        >
          <History size={16} />
          {t('loyalty.history')}
        </Button>
        {showHistory && (
          <div
            data-pagination-scope
            className="space-y-4"
          >
            <h3
              data-pagination-header
              className="font-semibold"
            >
              {t('loyalty.history')}
            </h3>
            {history.loading || history.error ? <ResourceFeedback {...history} /> : !history.data?.list.length ? (
              <p className="text-sm text-muted-foreground">
                {t('loyalty.empty')}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-primary/5">
                    <tr>
                      {['date', 'activity', 'change', 'heldChange', 'balanceAfter', 'heldAfter', 'order'].map(key => (
                        <th
                          key={key}
                          className="whitespace-nowrap p-3"
                        >
                          {t(`loyalty.${key}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.list.map(row => (
                      <tr
                        key={row.id}
                        className="border-t border-border"
                      >
                        <td className="whitespace-nowrap p-3">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="p-3">
                          {t(`loyalty.kinds.${row.kind}`)}
                        </td>
                        {['pointsDelta', 'heldDelta', 'netPointsAfter', 'heldPointsAfter'].map(key => (
                          <td
                            key={key}
                            className="p-3 font-semibold tabular-nums"
                          >
                            {formatNumber(row[key])}
                          </td>
                        ))}
                        <td className="p-3">
                          {row.orderId ? (
                            <Link
                              className="whitespace-nowrap text-primary underline-offset-4 hover:underline"
                              to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', encodeURIComponent(row.orderId))}
                            >
                              {t('customer.orders.details')}
                            </Link>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              currentPage={page}
              totalPages={history.data?.totalPages || 0}
              disabled={history.loading}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </section>
  )
}
