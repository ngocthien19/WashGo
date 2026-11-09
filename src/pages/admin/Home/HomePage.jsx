import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wallet, Package, Store, PanelsTopLeft, Users, Clock, RefreshCw, TrendingUp, ChartNoAxesColumn, ShieldAlert } from 'lucide-react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminDashboardApi } from '~/apis/admin/adminDashboardApi'
import { dashboardRange } from '~/utils/dashboardQuery'
import { dateRangeFilter } from '~/utils/dateRange'
import { groupOrders } from '~/utils/orderGroups'
import { formatCurrency, formatDateTime, formatNumber, formatDurationMinutes } from '~/utils/formats'
import StatCard from '~/components/workspace/StatCard'
import DashboardFilters from '~/components/workspace/DashboardFilters'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import RevenueChart from './RevenueChart'
import OrderStatus from '~/components/orders/OrderStatus'
import { ADMIN_ROUTES } from '~/utils/constants'

function Panel({ title, icon: Icon, resource, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <h2 className="mb-5 flex items-center gap-2 border-b border-border pb-4 text-base font-bold">
        <Icon
          size={20}
          className="text-primary"
        />
        {title}
      </h2>
      {resource && (resource.loading || resource.error || !resource.data) ? (
        <ResourceFeedback
          {...resource}
          loadingText="admin.loading"
        />
      ) : children}
    </section>
  )
}
function Metric({ resource, value, ...props }) {
  const { t } = useTranslation()
  return (
    <StatCard
      {...props}
      value={resource?.loading ? '…' : resource?.error ? '—' : value}
    >
      {resource?.error && (
        <Button
          variant="link"
          className="h-auto p-0 text-xs text-destructive"
          onClick={resource.retry}
        >
          {t('common.tryAgain')}
        </Button>
      )}
    </StatCard>
  )
}
export default function HomePage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${t('admin.overview')} | WashGo`
  }, [t])
  const [params, setParams] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const range = dashboardRange(params)
  const { from, to } = range
  const filter = useMemo(() => dateRangeFilter({ from, to }), [from, to])
  const revenue = useCatalogResource(useCallback((signal) => adminDashboardApi.revenue(filter, signal), [filter]), revision)
  const orders = useCatalogResource(useCallback((signal) => adminDashboardApi.orders(filter, signal), [filter]), revision)
  const merchants = useCatalogResource(adminDashboardApi.merchants, revision)
  const lockers = useCatalogResource(adminDashboardApi.lockers, revision)
  const waiting = useCatalogResource(adminDashboardApi.waiting, revision)
  const recent = useCatalogResource(useCallback((signal) => adminDashboardApi.recent(filter, signal), [filter]), revision)
  const groups = orders.data ? groupOrders(orders.data.counts) : []
  const max = Math.max(1, ...groups.map((item) => item.value))
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">
            {t('admin.workspace')}
          </p>
          <h1 className="text-3xl font-bold">
            {t('admin.overview')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {from}
            {' '}
            —
            {' '}
            {to}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DashboardFilters
            range={range}
            onChange={({ mode, from, to }) => setParams({ period: mode, ...(mode === 'custom' ? { from, to } : {}) })}
          />
          <Button
            variant="outline"
            className="h-11 px-5 text-base"
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          icon={Wallet}
          label={t('admin.revenue')}
          value={revenue.data ? formatCurrency(revenue.data.totalRevenue) : '—'}
          resource={revenue}
          className="border-l-emerald-500 [&_p]:text-xl"
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
        <Metric
          icon={Package}
          label={t('admin.orders')}
          value={orders.data?.total}
          resource={orders}
          className="border-l-primary"
          iconClassName="bg-primary/10 text-primary"
        />
        <Metric
          icon={Store}
          label={t('admin.activeMerchants')}
          value={merchants.data?.total}
          resource={merchants}
          className="border-l-violet-500"
          iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        />
        <Metric
          icon={PanelsTopLeft}
          label={t('admin.activeLockers')}
          value={lockers.data?.activeLockers}
          resource={lockers}
          className="border-l-cyan-500"
          iconClassName="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
        />
        <Metric
          icon={Users}
          label={t('admin.customers')}
          value="—"
          title={t('admin.customerUnavailable')}
          className="border-l-indigo-400"
          iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
        />
        <Metric
          icon={Clock}
          label={t('admin.waitingNow')}
          value={waiting.data?.total}
          resource={waiting}
          className="border-l-rose-400"
          iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-300"
        />
      </div>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title={t('admin.revenueChart')}
          icon={TrendingUp}
          resource={revenue}
        >
          {revenue.data && (
            <>
              <p className="-mt-2 mb-5 text-sm leading-6 text-muted-foreground">
                {t('admin.revenueBasis')}
              </p>
              <RevenueChart
                data={revenue.data.daily}
                range={range}
              />
              <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                {['laundryRevenue', 'refundedAmount', 'paidOrderCount'].map((key) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">
                      {t(`admin.money.${key}`)}
                    </p>
                    <p className="mt-1 font-bold tabular-nums">
                      {key === 'paidOrderCount' ? formatNumber(revenue.data[key]) : formatCurrency(revenue.data[key])}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
        <Panel
          title={t('admin.statusChart')}
          icon={ChartNoAxesColumn}
          resource={orders}
        >
          {orders.data && (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.key}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span>
                      {t(`merchant.groups.${group.key}`)}
                    </span>
                    <strong>
                      {formatNumber(group.value)}
                    </strong>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${group.value / max * 100}%`, backgroundColor: group.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title={t('admin.merchantRevenue')}
          icon={Store}
          resource={revenue}
        >
          {revenue.data?.byMerchant.length ? (
            <ol className="divide-y divide-border">
              {revenue.data.byMerchant.slice(0, 5).map((row, i) => (
                <li
                  key={row.merchantId || 'unassigned'}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">
                      {row.merchantName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('admin.paidOrders', { count: row.paidOrderCount })}
                    </p>
                  </div>
                  <strong className="text-sm tabular-nums">
                    {formatCurrency(row.revenue)}
                  </strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('admin.noData')}
            </p>
          )}
        </Panel>
        <Panel
          title={t('admin.waitingNow')}
          icon={Clock}
          resource={waiting}
        >
          {waiting.data?.list.length ? (
            <ul className="space-y-3">
              {waiting.data.list.map((row) => (
                <li
                  key={row.id}
                  className={`rounded-xl border p-4 ${row.isOverdue ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/25' : 'border-border bg-muted/20'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`${ADMIN_ROUTES.ORDERS}/${row.id}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {row.orderCode}
                    </Link>
                    {row.isOverdue && (
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-300">
                        {t('admin.overdue')}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 break-words text-sm text-muted-foreground">
                    {row.lockerName}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {t('admin.waitDuration', { duration: formatDurationMinutes(row.waitingMinutes) })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('admin.noWaiting')}
            </p>
          )}
        </Panel>
        <Panel
          title={t('admin.operations')}
          icon={ShieldAlert}
          resource={lockers}
        >
          {lockers.data && (
            <dl className="divide-y divide-border">
              {['totalLockers', 'maintenanceLockers', 'availableBoxes', 'occupiedBoxes', 'reservedBoxes'].map((key) => (
                <div
                  key={key}
                  className="flex justify-between gap-3 py-3 text-sm"
                >
                  <dt className="font-medium text-foreground">
                    {t(`admin.locker.${key}`)}
                  </dt>
                  <dd className="font-bold tabular-nums">
                    {formatNumber(lockers.data[key])}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-5 rounded-xl bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
            {t('admin.alertUnavailable')}
          </p>
        </Panel>
      </div>
      <Panel
        title={t('admin.recentOrders')}
        icon={Package}
        resource={recent}
      >
        {recent.data?.list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead className="bg-primary/5">
                <tr>
                  {['code', 'created', 'locker', 'status'].map((key) => (
                    <th
                      key={key}
                      className="p-3 font-semibold"
                    >
                      {t(`admin.order.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.data.list.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 font-bold">
                      <Link
                        to={`${ADMIN_ROUTES.ORDERS}/${row.id}`}
                        className="text-primary hover:underline"
                      >
                        {row.orderCode}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDateTime(row.createdOn)}
                    </td>
                    <td className="p-3">
                      {row.lockerName || '—'}
                    </td>
                    <td className="p-3">
                      <OrderStatus status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('admin.noData')}
          </p>
        )}
      </Panel>
    </Reveal>
  )
}
