import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PackageCheck, PackageOpen, Truck } from 'lucide-react'
import StatCard from '~/components/workspace/StatCard'
import { Button } from '~/components/ui/button'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperDeliveryApi } from '~/apis/shipper/shipperDeliveryApi'
import { historyFilter } from './historyModel'

export default function HistorySummary({ query, revision }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(useCallback(signal => shipperDeliveryApi.summary(historyFilter(query), signal), [query]), revision)
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[[resource, 'total', PackageCheck, 'border-l-primary', 'bg-primary/10 text-primary'], [resource, 'collectTotal', PackageOpen, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'], [resource, 'returnTotal', Truck, 'border-l-violet-500', 'bg-violet-500/10 text-violet-700 dark:text-violet-300']].map(([resource, key, Icon, edge, color]) => (
        <StatCard
          key={key}
          icon={Icon}
          label={t(`shipper.deliveryHistory.${key}`)}
          value={resource.loading ? '…' : resource.error ? '—' : resource.data?.[({ total: 'total', collectTotal: 'collectCount', returnTotal: 'returnCount' })[key]]}
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
