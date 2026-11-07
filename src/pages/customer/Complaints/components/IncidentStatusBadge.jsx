import { useTranslation } from 'react-i18next'
import { INCIDENT_STATUS_COLORS, ORDER_STATUS_COLORS } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function IncidentStatusBadge({ status }) {
  const { t } = useTranslation()
  const color = INCIDENT_STATUS_COLORS[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', ORDER_STATUS_COLORS[color || 'slate'])}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {t(status === 4 ? 'customer.sync.withdrawn' : color ? `customer.incidents.status.${status}` : 'customer.orders.unknown')}
    </span>
  )
}
