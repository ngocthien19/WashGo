import { useTranslation } from 'react-i18next'
import { Coins, PackageCheck, Sparkles } from 'lucide-react'
import { formatCurrency, formatNumber } from '~/utils/formats'
import { cn } from '~/lib/utils'

export default function ProfileStats({ profile }) {
  const { t } = useTranslation()
  const stats = [
    { label: 'customer.profile.totalOrders', value: formatNumber(profile.totalOrders), icon: PackageCheck, color: 'bg-primary/10 text-primary' },
    { label: 'customer.profile.totalSpent', value: formatCurrency(profile.totalSpent), icon: Coins, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    { label: 'customer.profile.loyaltyPoints', value: formatNumber(profile.loyaltyPoints), icon: Sparkles, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' }
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-col xl:flex-row"
        >
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', color)}>
            <Icon
              size={20}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <dt className="text-xs leading-5 text-muted-foreground">
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
