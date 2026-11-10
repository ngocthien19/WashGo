import { useTranslation } from 'react-i18next'
import { Trophy, Shirt } from 'lucide-react'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import { formatCurrency } from '~/utils/formats'
import ReportChange from './ReportChange'

export default function ReportTopServices({ services }) {
  const { t } = useTranslation()
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-amber-500/15 bg-amber-500/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold [&>svg]:text-amber-600 dark:[&>svg]:text-amber-300">
          <Trophy size={21} />
          {t('merchant.reports.bestServices')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('merchant.reportSync.ranking')}
        </p>
      </div>
      {services.length ? (
        <ol className="divide-y divide-border px-5">
          {services.map((service) => (
            <li
              key={service.serviceId}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-5 text-sm font-bold text-muted-foreground">
                  {service.rank}
                </span>
                <ResourceThumbnail
                  urls={service.imageUrls}
                  name={service.name}
                  icon={Shirt}
                />
                <div className="min-w-0">
                  <p className="break-words font-semibold">
                    {service.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('merchant.reportSync.serviceOrders', { count: service.orderCount })}
                  </p>
                  <div className="mt-1">
                    <ReportChange
                      value={service.orderCountChangePercent}
                      isNew={service.previousOrderCount === 0 && service.orderCount > 0}
                    />
                  </div>
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-muted-foreground">
                  {t('merchant.reportSync.listValue')}
                </p>
                <p className="mt-1 font-bold tabular-nums">
                  {formatCurrency(service.listValue)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-8 text-center text-muted-foreground">
          {t('merchant.reportSync.noServices')}
        </p>
      )}
    </section>
  )
}
