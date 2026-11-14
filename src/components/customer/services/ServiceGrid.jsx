import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import { catalogImages } from '~/apis/customer/customerCatalogApi'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Clock3 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SERVICE_TYPES, UI_MOTION } from '~/utils/config/constants'
import { formatCurrency } from '~/utils/format/formats'
import ServiceDetails from './ServiceDetails'
import { cn } from '~/lib/utils'

export default function ServiceGrid({ services, className, featured = false, slideDistance = 90 }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const Card = featured ? motion.article : 'article'
  const [selectedId, setSelectedId] = useState(null)

  return (
    <>
      <div className={cn('grid grid-cols-2 items-stretch justify-items-center gap-3 sm:gap-4 md:grid-cols-3', className)}>
        {services.map((service, index) => (
          <Card
            key={service.id}
            {...(featured ? {
              initial: false,
              whileInView: reduceMotion ? undefined : { y: [slideDistance, 0] },
              viewport: { once: true, amount: .12, margin: '0px 0px 80px 0px' },
              transition: { duration: .8, delay: index * .1, ease: UI_MOTION.EASE }
            } : {})}
            className={cn('group relative flex w-full min-w-0 max-w-[17rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-2.5 shadow-sm transition-[border-color,box-shadow,translate] delay-0 duration-200 ease-in-out hover:border-primary/45 hover:shadow-lg hover:shadow-primary/7 motion-safe:hover:-translate-y-1 motion-reduce:transition-none sm:p-3.5', featured && 'py-3.5 sm:py-5')}
          >
            <div className={cn('relative mx-auto mb-2.5 w-full', featured ? 'max-w-56' : 'max-w-52')}>
              <ResourceThumbnail
                urls={catalogImages(service)}
                name={service.name}
                className="aspect-square h-auto w-full rounded-xl"
              />
              <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full border border-border/60 bg-card/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm sm:left-2 sm:top-2 sm:text-xs">
                {t(SERVICE_TYPES.find((type) => type.value === String(service.serviceType))?.label || 'customer.laundry')}
              </span>
            </div>
            <h3 className="line-clamp-2 break-words text-sm font-bold leading-5 [overflow-wrap:anywhere] sm:text-base sm:leading-6">
              {service.name}
            </h3>
            {service.description && (
              <p className="mt-1 hidden break-words text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere] sm:line-clamp-1">
                {service.description}
              </p>
            )}
            <p className="mt-2 flex items-start gap-1 text-xs leading-4 text-muted-foreground">
              <Clock3
                size={13}
                className="mt-0.5 shrink-0"
              />
              <span className="line-clamp-2">
                {service.estimatedDurationHours > 0 ? t('customer.estimatedHours', { estimatedDurationHours: service.estimatedDurationHours }) : t('customer.durationNotAvailableYet')}
              </span>
            </p>
            <div className={cn('mt-3 flex flex-1 items-end justify-between gap-1.5 border-t border-border/70 pt-2.5 sm:gap-2', featured && 'mt-4 pt-3.5')}>
              <p className="min-w-0 flex-1 break-words text-sm font-bold leading-5 text-primary [overflow-wrap:anywhere] sm:text-base sm:leading-6">
                {formatCurrency(service.unitPrice)}
                <span className="block text-[11px] font-normal leading-4 text-muted-foreground sm:text-xs">
                  {service.unit ? ` / ${service.unit}` : ''}
                </span>
              </p>
              <Button
                variant="outline-primary"
                size="icon"
                className="size-11 rounded-full"
                aria-label={t('customer.viewDetailsFor', { name: service.name })}
                onClick={() => setSelectedId(service.id)}
              >
                <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {selectedId && (
        <ServiceDetails
          key={selectedId}
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
