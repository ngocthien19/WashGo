import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { reviewPublication } from '../reviewModel'

export function ReviewScore({ value }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-amber-700 dark:text-amber-300">
      <Star className="size-4 fill-current" />
      {value}
      <span className="font-normal text-muted-foreground">/ 5</span>
    </span>
  )
}

export function ReviewStatus({ row }) {
  const { t } = useTranslation()
  const { label } = reviewPublication(row)
  const color = label === 'hidden' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : label === 'pendingApproval' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${color}`}>
      {t(`admin.reviews.${label}`)}
    </span>
  )
}
