import Reveal from '~/components/motion/Reveal'
import { useCallback, useEffect } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, WashingMachine, DoorOpen, CircleCheck, RefreshCw, Store, ArrowUpRight, CircleDollarSign } from 'lucide-react'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantDashboardApi } from '~/apis/merchant/merchantDashboardApi'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import OrderCharts from './components/OrderCharts'
import OrderPreview from './components/OrderPreview'

const statuses = { 1: 'PENDING', 2: 'DEPOSITED', 3: 'COLLECTED', 4: 'WASHING', 5: 'DRYING', 6: 'IRONING', 7: 'FOLDING', 8: 'AWAITING_PAYMENT', 9: 'PAID', 10: 'READY_TO_RETURN', 11: 'RETURNED', 12: 'COMPLETED', 13: 'MOVED_TO_STORAGE', 99: 'CANCELLED' }
export default function HomePage() {
  const { t } = useTranslation()
  const { profile } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const orderId = params.get('order')
  const validId = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId || '')
  const loadOrders = useCallback((signal) => merchantDashboardApi.orders(signal), [])
  const loadSettlements = useCallback((signal) => merchantDashboardApi.settlements(signal), [])
  const orders = useCatalogResource(loadOrders)
  const settlements = useCatalogResource(loadSettlements)
  useEffect(() => {
    if (!orderId) {
      document.title = `${t('merchant.overview')} | WashGo`
    }
  }, [t, orderId])
  const stats = orders.data && [
    ['totalOrders', orders.data.total, Package, 'text-primary bg-primary/10', 'border-l-primary'],
    ['processing', [4, 5, 6, 7].reduce((sum, key) => sum + orders.data.counts[key], 0), WashingMachine, 'text-violet-600 dark:text-violet-300 bg-violet-500/10', 'border-l-violet-500'],
    ['ready', orders.data.counts[10], DoorOpen, 'text-cyan-700 dark:text-cyan-300 bg-cyan-500/10', 'border-l-cyan-500'],
    ['completed', orders.data.counts[12], CircleCheck, 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10', 'border-l-emerald-500']
  ]
  return (
    <Reveal className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('merchant.overview')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {profile.data?.businessName || t('merchant.welcome')}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-xl px-4"
          disabled={orders.loading || settlements.loading || profile.loading}
          onClick={() => {
            orders.retry(); settlements.retry(); profile.retry()
          }}
        >
          <RefreshCw size={17} />
          {t('customer.orders.refresh')}
        </Button>
      </div>
      {profile.error && (
        <ResourceFeedback
          error={profile.error}
          retry={profile.retry}
        />
      )}
      {orders.loading || orders.error ? (
        <ResourceFeedback
          {...orders}
          loadingText="merchant.loading"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats?.map(([key, value, Icon, color, edge]) => (
              <section
                key={key}
                className={`rounded-2xl border border-border border-l-4 bg-card p-5 shadow-sm ${edge}`}
              >
                <span className={`mb-4 grid size-12 place-items-center rounded-2xl ${color}`}>
                  <Icon size={23} />
                </span>
                <h2 className="text-sm text-muted-foreground">
                  {t(`merchant.${key}`)}
                </h2>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  <AnimatedNumber value={value} />
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('merchant.allTime')}
                </p>
              </section>
            ))}
          </div>
          {orders.data && <OrderCharts counts={orders.data.counts} />}
        </>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="flex items-center gap-3 border-b border-primary/10 bg-primary/5 p-5 text-lg font-bold text-foreground">
            <Package className="size-5 text-primary" />
            {t('merchant.recentOrders')}
          </h2>
          {orders.loading || orders.error || !orders.data?.recent.length ? (
            <ResourceFeedback
              {...orders}
              empty="merchant.noOrders"
              loadingText="merchant.loading"
            />
          ) : (
            <ul className="divide-y divide-border">
              {orders.data.recent.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-5"
                >
                  <div className="min-w-0">
                    <p className="font-bold">
                      {order.merchantOrderCode || order.orderCode}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {order.serviceNames?.join(' · ') || order.lockerName}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(order.createdOn)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
                      {t(`customer.orders.status.${statuses[order.status]}`, { defaultValue: t('customer.orders.unknown') })}
                    </span>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={t('merchant.viewOrder', { code: order.orderCode })}
                      onClick={() => setParams({ order: order.id })}
                    >
                      <ArrowUpRight size={17} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="flex items-center gap-3 border-b border-emerald-500/15 bg-emerald-500/5 p-5 text-lg font-bold text-foreground">
            <CircleDollarSign className="size-5 text-emerald-600" />
            {t('merchant.settlements')}
          </h2>
          {settlements.loading || settlements.error || !settlements.data?.list.length ? (
            <ResourceFeedback
              {...settlements}
              empty="merchant.noSettlements"
              loadingText="merchant.loading"
            />
          ) : (
            <ul className="divide-y divide-border">
              {settlements.data.list.map((item) => (
                <li
                  key={item.id}
                  className="space-y-2 p-5"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatDateTime(item.periodFrom)}
                    {' '}
                    —
                    {' '}
                    {formatDateTime(item.periodTo)}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(item.payoutAmount)}
                    </p>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {t(`merchant.settlementStatus.${item.status}`, { defaultValue: t('customer.orders.unknown') })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('merchant.settlementPayout')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
        <Store className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          {t('merchant.revenueNote')}
        </p>
      </div>
      {validId && (
        <OrderPreview
          id={orderId}
          onClose={() => setParams({})}
        />
      )}
    </Reveal>
  )
}
