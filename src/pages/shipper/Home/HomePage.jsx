import DeliveryLocker from '../components/DeliveryLocker'
import { useCallback, useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, Truck, PackageCheck, CircleCheck, RefreshCw, History } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import StatCard from '~/components/workspace/StatCard'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperWorkspaceApi } from '~/apis/shipper/shipperWorkspaceApi'
import { dateRangeFilter } from '~/utils/dateRange'
import { formatDateTime } from '~/utils/formats'
import ShipperPanel from '../components/ShipperPanel'
import TaskPreview from './TaskPreview'
import DashboardFilters from '~/components/workspace/DashboardFilters'
import { dashboardRange } from '~/utils/dashboardQuery'

export default function HomePage() {
  const { t } = useTranslation()
  const { profile } = useOutletContext()
  const [revision, setRevision] = useState(0)
  const [params, setParams] = useSearchParams()
  const range = dashboardRange(params.has('period') ? params : new URLSearchParams({ period: 'day' }))
  const { from, to } = range
  const collect = useCatalogResource(useCallback((signal) => shipperWorkspaceApi.pending(1, signal), []), revision)
  const returns = useCatalogResource(useCallback((signal) => shipperWorkspaceApi.pending(2, signal), []), revision)
  const history = useCatalogResource(useCallback((signal) => shipperWorkspaceApi.history(dateRangeFilter({ from, to }), signal), [from, to]), revision)
  useEffect(() => {
    document.title = `${t('shipper.overview')} | WashGo`
  }, [t])
  const metric = (resource, value) => resource.loading ? '…' : resource.error ? '—' : value
  return (
    <Reveal className="mx-auto max-w-[1440px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {t('shipper.overview')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('shipper.dashboardDescription')}
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
            onClick={() => {
              profile.retry(); setRevision((value) => value + 1)
            }}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
        </div>
      </header>
      {profile.error && <ResourceFeedback {...profile} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[[collect, collect.data?.total, 'collect', Package, 'border-l-primary', 'bg-primary/10 text-primary'], [returns, returns.data?.total, 'return', Truck, 'border-l-violet-500', 'bg-violet-500/10 text-violet-600 dark:text-violet-300'], [history, history.data?.total, 'periodCompleted', CircleCheck, 'border-l-teal-500', 'bg-teal-500/10 text-teal-700 dark:text-teal-300'], [profile, profile.data?.totalDeliveries, 'lifetime', PackageCheck, 'border-l-amber-500', 'bg-amber-500/10 text-amber-700 dark:text-amber-300']].map(([resource, value, key, Icon, edge, color]) => (
          <StatCard
            key={key}
            icon={Icon}
            label={t(`shipper.${key}`)}
            value={metric(resource, value)}
            className={edge}
            iconClassName={color}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('shipper.periodScope', { from, to })}
      </p>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <TaskPreview
          resource={collect}
          type={1}
          icon={Package}
        />
        <TaskPreview
          resource={returns}
          type={2}
          icon={Truck}
        />
      </div>
      <ShipperPanel
        title={t('shipper.periodHistory')}
        icon={History}
        tone="teal"
      >
        <p className="px-5 pt-4 text-sm text-muted-foreground">
          {t('shipper.periodHistoryBasis', { from, to })}
        </p>
        {history.loading || history.error || !history.data?.list.length ? (
          <ResourceFeedback
            {...history}
            empty="shipper.noPeriodHistory"
          />
        ) : (
          <ul className="divide-y divide-border px-5">
            {history.data.list.map((row, index) => (
              <li
                key={`${row.orderId}-${row.taskType}-${row.completedAt}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-bold text-primary">
                    {row.orderCode}
                  </p>
                  <div className="mt-3">
                    <DeliveryLocker
                      name={row.lockerName}
                      address={row.lockerAddress}
                      images={row.lockerImageUrls}
                      box={row.boxNumber}
                    />
                  </div>
                </div>
                <span className="rounded-full bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-700 dark:text-teal-300">
                  {t(row.taskType === 1 ? 'shipper.collected' : 'shipper.returned')}
                </span>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(row.completedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ShipperPanel>
    </Reveal>
  )
}
