import { useTranslation } from 'react-i18next'
import { Coins, PackageCheck, Star } from 'lucide-react'
import { formatCurrency, formatNumber } from '~/utils/format/formats'
import { cn } from '~/lib/utils'

export default function ProfileStats({ profile }) {
  const { t } = useTranslation()
  const stats = [
    { label: 'customer.profile.totalOrders', value: formatNumber(profile.totalOrders), icon: PackageCheck, border: 'border-l-primary', color: 'bg-primary/10 text-primary' },
    { label: 'customer.profile.totalSpent', value: formatCurrency(profile.totalSpent), icon: Coins, border: 'border-l-emerald-500', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    { label: 'customer.profile.loyaltyPoints', value: formatNumber(profile.loyaltyPoints), icon: Star, border: 'border-l-amber-500', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' }
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, color, border }) => (
        <div
          key={label}
          className={cn('flex min-w-0 items-start gap-3 rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm sm:flex-col xl:flex-row', border)}
        >
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', color)}>
            <Icon
              size={20}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <dt className="text-sm leading-5 text-muted-foreground">
              {t(label)}
            </dt>
            <dd className="mt-1 break-words text-lg font-bold tracking-tight">
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}
