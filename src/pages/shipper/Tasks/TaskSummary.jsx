import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PackageCheck, PackageOpen, Truck } from 'lucide-react'
import StatCard from '~/components/workspace/StatCard'
import { Button } from '~/components/ui/button'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { dateRangeFilter } from '~/utils/format/dateRange'

export default function TaskSummary({ keyword, from, to, revision }) {
  const { t } = useTranslation()
  const dates = dateRangeFilter({ from, to })
  const resource = useCatalogResource(useCallback(signal => shipperTaskApi.summary({ keyword: keyword || undefined, assignedFrom: dates.fromDate, assignedTo: dates.toDate }, signal), [keyword, dates.fromDate, dates.toDate]), revision)
  return (
    <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {[[resource, 'storageTransfer', PackageCheck, 'border-l-primary', 'bg-primary/10 text-primary'], [resource, 'storageReturn', Truck, 'border-l-primary', 'bg-primary/10 text-primary'], [resource, 'total', PackageCheck, 'border-l-primary', 'bg-primary/10 text-primary'], [resource, 'collectTotal', PackageOpen, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'], [resource, 'returnTotal', Truck, 'border-l-violet-500', 'bg-violet-500/10 text-violet-700 dark:text-violet-300']].map(([resource, key, Icon, edge, color]) => (
        <StatCard
          key={key}
          icon={Icon}
          label={t(key.startsWith('storage') ? `storage.${key}` : `shipper.tasks.${key}`)}
          value={resource.loading ? '…' : resource.error ? '—' : resource.data?.[({ total: 'totalPending', collectTotal: 'collectPending', returnTotal: 'returnPending', storageTransfer: 'storageTransferPending', storageReturn: 'storageReturnPending' })[key]]}
          className={edge}
          iconClassName={color}
        >
          {resource.error && (
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-destructive"
              onClick={resource.retry}
            >
              {t('common.tryAgain')}
            </Button>
          )}
        </StatCard>
      ))}
    </div>
  )
}
