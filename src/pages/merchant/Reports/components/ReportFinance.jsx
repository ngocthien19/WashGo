import { useTranslation } from 'react-i18next'
import { Wallet, AlertTriangle, Plus, Minus, Equal } from 'lucide-react'
import { formatCurrency } from '~/utils/formats'
import ReportChange from './ReportChange'

export default function ReportFinance({ data }) {
  const { t } = useTranslation()
  const missing = data.kpis.ordersWithoutCommissionSnapshot
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Wallet
          size={21}
          className="text-primary"
        />
        {t('merchant.reportSync.finance')}
      </h2>
      {missing > 0 && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
        >
          <AlertTriangle
            size={18}
            className="shrink-0"
          />
          {t('merchant.reportSync.coverage', { count: missing })}
        </p>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <dl className="divide-y divide-border rounded-xl border border-border px-4">
          {['grossLaundryRevenue', 'refunds', 'commission', 'merchantPayout'].map((key) => {
            const withheld = missing > 0 && ['commission', 'merchantPayout'].includes(key)
            const metric = data.kpis[key]
            const Icon = key === 'grossLaundryRevenue' ? Plus : key === 'merchantPayout' ? Equal : Minus
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <dt className="flex items-center gap-2 text-sm font-medium">
                  <Icon
                    size={17}
                    className={key === 'refunds' ? 'text-red-500' : key === 'commission' ? 'text-amber-600' : 'text-primary'}
                    aria-hidden="true"
                  />
                  {t(key === 'merchantPayout' ? 'merchant.reportSync.income' : `merchant.reportSync.flow.${key}`)}
                </dt>
                <dd className="ml-auto break-words text-lg font-bold tabular-nums">
                  {withheld ? t('merchant.reportSync.reconcile') : formatCurrency(metric.current)}
                </dd>
              </div>
            )
          })}
        </dl>
        <div className="flex flex-col justify-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
            <Wallet size={20} />
            {t('merchant.reportSync.income')}
          </p>
          <p className="break-words text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {missing ? t('merchant.reportSync.reconcile') : formatCurrency(data.kpis.merchantPayout.current)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('merchant.reportSync.flow.formula')}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground">
            {t('merchant.reportSync.flow.fees')}
          </span>
          <strong className="tabular-nums">
            {formatCurrency(data.kpis.feesCollected.current)}
          </strong>
          <ReportChange
            value={data.kpis.feesCollected.changePercent}
            isNew={data.kpis.feesCollected.isNew}
          />
        </div>
        <p className="text-muted-foreground">
          {t('merchant.reportSync.cancelled', { count: data.kpis.ordersCancelled.current })}
        </p>
      </div>
    </section>
  )
}
