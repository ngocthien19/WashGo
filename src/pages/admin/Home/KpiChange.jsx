import { useTranslation } from 'react-i18next'
import { formatNumber } from '~/utils/format/formats'
export default function KpiChange({ metric }) {
  const { t } = useTranslation()
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {metric.changePercent === null ? t(metric.isNew ? 'admin.workspaceSync.newActivity' : 'merchant.reports.noBase') : `${metric.changePercent > 0 ? '+' : ''}${formatNumber(metric.changePercent)}%`}
    </p>
  )
}
