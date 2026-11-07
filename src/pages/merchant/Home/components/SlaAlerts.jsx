import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, ArrowUpRight, Truck, WashingMachine, PackageCheck } from 'lucide-react'
import { merchantInsightsApi } from '~/apis/merchant/merchantInsightsApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import { Button } from '~/components/ui/button'
import { MERCHANT_ROUTES } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'

export default function SlaAlerts({ revision }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(merchantInsightsApi.alerts, revision)
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
          <dl className="divide-y divide-border rounded-xl border border-border px-4">
            {['collectionAlertsCount', 'processingAlertsCount', 'returnAlertsCount'].map((key, index) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 py-3.5"
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
          {!alerts.totalAlerts ? (
            <p className="text-sm text-muted-foreground">
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
                      {t('merchant.sync.overdueMinutes', { count: item.overdueMinutes })}
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
        </div>
      )}
    </section>
  )
}
