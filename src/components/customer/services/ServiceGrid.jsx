import { useState } from 'react'
import { ArrowRight, Clock3 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import { SERVICE_TYPES, UI_MOTION } from '~/utils/constants'
import { formatCurrency } from '~/utils/formats'
import ServiceIcon from './ServiceIcon'
import ServiceDetails from './ServiceDetails'
import { cn } from '~/lib/utils'

export default function ServiceGrid({ services, className }) {
  const [selectedId, setSelectedId] = useState(null)

  return (
    <>
      <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {services.map((service, index) => (
          <Reveal
            as="article"
            key={service.id}
            delay={index * UI_MOTION.STAGGER}
            lift
            className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-[border-color,box-shadow] delay-0 duration-200 ease-in-out hover:border-primary/45 hover:shadow-xl hover:shadow-primary/7 motion-reduce:transition-none sm:p-7"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/5" />
            <div className="relative mb-6 flex items-center justify-between gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                <ServiceIcon type={service.serviceType} />
              </span>
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {SERVICE_TYPES.find((type) => type.value === String(service.serviceType))?.label || 'Giặt ủi'}
              </span>
            </div>
            <h3 className="line-clamp-2 break-words text-lg font-bold leading-7 [overflow-wrap:anywhere]">
              {service.name}
            </h3>
            <p className="mt-2 line-clamp-2 min-h-12 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              {service.description || 'Xem chi tiết để tìm hiểu dịch vụ.'}
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 size={14} />
              {service.estimatedDurationHours > 0 ? `Dự kiến ${service.estimatedDurationHours} giờ` : 'Thời gian chưa cập nhật'}
            </p>
            <div className="mt-6 flex flex-1 items-end justify-between gap-3 border-t border-border/70 pt-5">
              <p className="min-w-0 break-words text-lg font-bold text-primary">
                {formatCurrency(service.unitPrice)}
                <span className="text-xs font-normal text-muted-foreground">
                  {service.unit ? ` / ${service.unit}` : ''}
                </span>
              </p>
              <Button
                variant="outline-primary"
                size="icon"
                className="size-11 rounded-full"
                aria-label={`Xem chi tiết ${service.name}`}
                onClick={() => setSelectedId(service.id)}
              >
                <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
              </Button>
            </div>
          </Reveal>
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
