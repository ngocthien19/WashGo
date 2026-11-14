import { PackageOpen, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export default function DeliveryTypeBadge({ type }) {
  const { t } = useTranslation()
  if (![1, 2, 3, 4].includes(type)) {
    return <span>—</span>
  }
  const Icon = type === 1 ? PackageOpen : Truck
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ${type === 1 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-violet-500/10 text-violet-700 dark:text-violet-300'}`}>
      <Icon size={17} />
      {t(`shipper.taskTypes.${type}`)}
    </span>
  )
}
