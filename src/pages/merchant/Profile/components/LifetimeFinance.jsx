import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { formatCurrency } from '~/utils/formats'

export default function LifetimeFinance({ resource }) {
  const { t } = useTranslation()
  const value = resource.data
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <h2 className="flex items-center gap-3 border-b border-violet-500/15 bg-violet-500/5 p-5 text-lg font-bold">
        <Wallet className="text-violet-600 dark:text-violet-300" />
        {t('merchant.backendSync.lifetimeFinance')}
      </h2>
      {resource.loading || resource.error || !value ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="space-y-4 p-5">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout', 'feesCollected'].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-background/50 p-4"
              >
                <dt className="text-sm text-muted-foreground">
                  {t(`merchant.backendSync.finance.${key}`)}
                </dt>
                <dd className="mt-2 text-lg font-bold">
                  {!value.commissionComplete && ['commission', 'merchantPayout'].includes(key) ? t('merchant.backendSync.reconciliation') : formatCurrency(value[key])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            {t('merchant.backendSync.paidOrders', { count: value.paidOrderCount })}
          </p>
          {!value.commissionComplete && (
            <p
              role="status"
              className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
            >
              {t('merchant.backendSync.uncovered', { count: value.ordersWithoutCommissionSnapshot })}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
