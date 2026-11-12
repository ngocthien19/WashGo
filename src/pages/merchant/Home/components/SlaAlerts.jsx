import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useState } from 'react'
import { SelectField } from '~/components/ui/select'
import TablePagination from '~/components/Pagination/TablePagination'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, ArrowUpRight, Truck, WashingMachine, PackageCheck, ListFilter, ListChecks } from 'lucide-react'
import { merchantInsightsApi } from '~/apis/merchant/merchantInsightsApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import { Button } from '~/components/ui/button'
import { MERCHANT_ROUTES } from '~/utils/constants'
import { formatDateTime, formatDurationMinutes } from '~/utils/formats'

export default function SlaAlerts({ revision }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [alertType, setAlertType] = useState('')
  const take = 5
  const resource = useCatalogResource(useCallback(async (signal) => {
    const value = await merchantInsightsApi.alerts(signal, { page, take, alertType: alertType ? Number(alertType) : undefined })
    const last = Math.max(1, Math.ceil(value.priorityTotal / take))
    if (!signal.aborted && page > last) {
      setPage(last)
    }
    return value
  }, [page, alertType]), revision)
  const alerts = resource.data
  return (
    <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
      <h2 className="flex items-center gap-3 border-b border-amber-500/15 bg-amber-500/5 p-5 text-lg font-bold">
        <TriangleAlert
          size={21}
          className="text-amber-600 dark:text-amber-300"
        />
        {t('merchant.sync.alerts')}
        <span className="ml-auto rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          {t('merchant.sync.currentAlerts')}
        </span>
      </h2>
      {resource.loading || resource.error || !alerts ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="space-y-5 p-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            {['collectionAlertsCount', 'processingAlertsCount', 'returnAlertsCount'].map((key, index) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
              >
                <dt className="flex items-center gap-3 text-sm font-medium">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${['bg-amber-500/10 text-amber-700 dark:text-amber-300', 'bg-rose-500/10 text-rose-700 dark:text-rose-300', 'bg-violet-500/10 text-violet-700 dark:text-violet-300'][index]}`}>
                    {(() => {
                      const Icon = [Truck, WashingMachine, PackageCheck][index]; return <Icon size={17} />
                    })()}
                  </span>
                  {t(`merchant.sync.${key}`)}
                </dt>
                <dd className={`min-w-9 rounded-lg px-2 py-1 text-center text-lg font-bold ${['text-amber-700 dark:text-amber-300', 'text-rose-700 dark:text-rose-300', 'text-violet-700 dark:text-violet-300'][index]}`}>
                  <AnimatedNumber value={alerts[key]} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <ListFilter
                size={18}
                className="text-primary"
              />
              {t('merchant.backendSync.alertFilterTitle')}
            </h3>
            <div className="grid max-w-sm gap-2 workspace-filters">
              <label
                htmlFor="merchant-alert-type"
                className="text-sm font-medium"
              >
                {t('merchant.backendSync.alertFilter')}
              </label>
              <SelectField
                id="merchant-alert-type"
                label={t('merchant.backendSync.alertFilter')}
                value={alertType}
                onValueChange={(value) => {
                  setAlertType(value); setPage(1)
                }}
                options={['', '1', '2', '3'].map((value) => ({ value, label: value ? t(`merchant.sync.alertType.${value}`) : t('common.all') }))}
              />
            </div>
          </div>
          <ClearFiltersButton
            active={alertType}
            onClear={() => {
              setAlertType(''); setPage(1)
            }}
          />
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <ListChecks
                  size={18}
                  className="text-primary"
                />
                {t('merchant.backendSync.alertResults')}
              </h3>
              <span className="text-sm text-muted-foreground">
                {t('merchant.backendSync.alertResultCount', { count: alerts.priorityTotal })}
              </span>
            </div>
            <div className="px-4">
              {!alerts.priorityTotal ? (
                <p className="py-6 text-sm text-muted-foreground">
                  {t('merchant.sync.noAlerts')}
                </p>
              ) : (
                <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                  {alerts.priorityOrders.map((item) => (
                    <li
                      key={`${item.orderId}-${item.alertType}`}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold">
                          {item.merchantOrderCode || item.orderCode}
                        </p>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {t(`merchant.sync.alertType.${item.alertType}`)}
                          {' '}
                          ·
                          {' '}
                          {t('merchant.sync.overdueDuration', { duration: formatDurationMinutes(item.overdueMinutes) })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('merchant.sync.deadline', { date: formatDateTime(item.deadline) })}
                        </p>
                        <p className="break-words text-sm text-muted-foreground">
                          {item.lockerName}
                          {item.boxNumber ? ` · ${t('customer.order.box', { number: item.boxNumber })}` : ''}
                        </p>
                      </div>
                      <Button
                        render={<Link to={`${MERCHANT_ROUTES.ORDERS}/${item.orderId}`} />}
                        nativeButton={false}
                        role="link"
                        variant="outline"
                        className="h-11 px-4"
                      >
                        <ArrowUpRight size={17} />
                        {t(`merchant.sync.action.${item.actionType}`, { defaultValue: t('merchant.orders.manage') })}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {alerts.priorityTotal > 0 && (
                <TablePagination
                  currentPage={page}
                  totalPages={Math.ceil(alerts.priorityTotal / take)}
                  total={alerts.priorityTotal}
                  pageSize={take}
                  rowCount={alerts.priorityOrders.length}
                  onPageChange={setPage}
                  className="px-0 pb-4"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
