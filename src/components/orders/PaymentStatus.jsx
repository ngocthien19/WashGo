import { useTranslation } from 'react-i18next'

export default function PaymentStatus({ status }) {
  const { t } = useTranslation()
  const color = { 1: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', 2: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 3: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' }[status] || 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${color}`}>
      {t(`customer.orders.paymentStatus.${status}`, { defaultValue: '—' })}
    </span>
  )
}
