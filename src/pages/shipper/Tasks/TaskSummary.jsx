import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PackageCheck, PackageOpen, Truck } from 'lucide-react'
import StatCard from '~/components/workspace/StatCard'
import { Button } from '~/components/ui/button'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'

export default function TaskSummary({ keyword, revision }) {
  const { t } = useTranslation()
  const all = useCatalogResource(useCallback((signal) => shipperTaskApi.list({ keyword: keyword || undefined, take: 1 }, signal), [keyword]), revision)
  const collect = useCatalogResource(useCallback((signal) => shipperTaskApi.list({ keyword: keyword || undefined, taskType: 1, take: 1 }, signal), [keyword]), revision)
  const returns = useCatalogResource(useCallback((signal) => shipperTaskApi.list({ keyword: keyword || undefined, taskType: 2, take: 1 }, signal), [keyword]), revision)
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[[all, 'total', PackageCheck, 'border-l-primary', 'bg-primary/10 text-primary'], [collect, 'collectTotal', PackageOpen, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'], [returns, 'returnTotal', Truck, 'border-l-violet-500', 'bg-violet-500/10 text-violet-700 dark:text-violet-300']].map(([resource, key, Icon, edge, color]) => (
        <StatCard
          key={key}
          icon={Icon}
          label={t(`shipper.tasks.${key}`)}
          value={resource.loading ? '…' : resource.error ? '—' : resource.data?.total}
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
