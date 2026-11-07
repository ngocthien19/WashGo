import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ReportChange({ value, isNew = false, points = false }) {
  const { t, i18n } = useTranslation()
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  const formatted = Number.isFinite(value) ? `${value > 0 ? '+' : ''}${new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(value)}${points ? ` ${t('merchant.reportSync.points')}` : '%'}` : t(isNew ? 'merchant.reportSync.new' : 'merchant.reports.noBase')
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${value > 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : value < 0 ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
      <Icon size={13} />
      {formatted}
    </span>
  )
}
