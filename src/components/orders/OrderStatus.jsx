import { useTranslation } from 'react-i18next'
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_COLORS } from '~/utils/constants'

export default function OrderStatus({ status }) {
  const { t } = useTranslation()
  const option = ORDER_STATUS_OPTIONS.find((item) => Number(item.value) === status)
  return (
    <span className={`inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${ORDER_STATUS_COLORS[option?.color] || ORDER_STATUS_COLORS.slate}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(option?.label || 'customer.orders.unknown')}
    </span>
  )
}
