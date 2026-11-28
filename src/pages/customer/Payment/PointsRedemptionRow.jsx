import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/format/formats'

export default function PointsRedemptionRow({ points }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <dt className="min-w-0 text-sm font-medium leading-6">
        {t('loyalty.paymentPoints', { points: formatNumber(points) })}
      </dt>
      <dd className="shrink-0 whitespace-nowrap text-base font-semibold tabular-nums text-amber-800 dark:text-amber-200">
        {points > 0 ? '−' : ''}
        {formatCurrency(points)}
      </dd>
    </div>
  )
}
