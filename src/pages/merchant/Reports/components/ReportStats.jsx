import { useTranslation } from 'react-i18next'
import { Wallet, ReceiptText, CircleCheck, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import { percentChange } from '../reportModel'

export default function ReportStats({ data }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['revenue', Wallet, 'border-l-primary', 'bg-primary/10 text-primary'],
        ['total', ReceiptText, 'border-l-violet-500', 'bg-violet-500/10 text-violet-600 dark:text-violet-300'],
        ['completed', CircleCheck, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'],
        ['onTime', Clock, 'border-l-amber-500', 'bg-amber-500/10 text-amber-600 dark:text-amber-300']
      ].map(([key, Icon, edge, color]) => {
        const value = data.current[key]
        const available = Number.isFinite(value)
        const delta = available ? percentChange(value, data.previous[key]) : null
        const ChangeIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
        return (
          <section
            key={key}
            aria-label={t(`merchant.reports.${key}`)}
            className={`rounded-2xl border border-border border-l-4 bg-card p-5 shadow-sm ${edge}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`grid size-11 place-items-center rounded-xl ${color}`}>
                <Icon size={22} />
              </span>
              {available && (
                <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold ${delta > 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : delta < 0 ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
                  <ChangeIcon size={15} />
                  {delta === null ? t('merchant.reports.noBase') : `${delta > 0 ? '+' : ''}${new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(delta)}%`}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-sm font-semibold text-muted-foreground">
              {t(`merchant.reports.${key}`)}
            </h2>
            <p className="mt-2 text-3xl font-bold">
              {available ? <AnimatedNumber value={value} /> : '—'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t(available ? 'merchant.reports.comparison' : 'merchant.reports.unavailable')}
            </p>
          </section>
        )
      })}
    </div>
  )
}
