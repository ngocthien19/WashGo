import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { MapPin, ArrowUpRight, Navigation } from 'lucide-react'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import { cn } from '~/lib/utils'
import { formatDistance, formatLockerAddress, getDistanceKm, hasCoordinates } from '~/utils/formats'
import { UI_MOTION } from '~/utils/constants'
import LockerMap from './LockerMap'
import LockerDetails from './LockerDetails'

export default function LockerResults({ lockers, position }) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const mapRef = useRef(null)
  const selectLocker = (id, scroll = false) => {
    setSelectedId(id)
    setSelectionVersion((version) => version + 1)
    if (scroll) {
      mapRef.current?.scrollIntoView({ behavior: 'instant', block: 'center' })
    }
  }
  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div
          ref={mapRef}
          className="min-w-0 scroll-mt-[var(--customer-header-offset)]"
        >
          <LockerMap
            lockers={lockers}
            selectedId={selectedId}
            selectionVersion={selectionVersion}
            position={position}
            onSelect={selectLocker}
          />
        </div>
        <div className="space-y-3 lg:max-h-[32rem] lg:overflow-y-auto lg:pr-1">
          {lockers.map((locker, index) => {
            const distance = hasCoordinates(position)
              ? formatDistance(locker.distanceKm ?? getDistanceKm(position, locker)) : ''
            return (
              <Reveal
                key={locker.id}
                delay={index * UI_MOTION.STAGGER}
              >
                <article className={cn('min-w-0 rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow] delay-0 duration-200 ease-in-out hover:shadow-md motion-reduce:transition-none', selectedId === locker.id ? 'border-primary/60 ring-1 ring-primary/15' : 'border-border/70')}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <MapPin size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 line-clamp-2 font-semibold [overflow-wrap:anywhere]">
                          {locker.name}
                        </h3>
                        {distance && (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/8 px-2 py-1 text-xs font-semibold tabular-nums text-primary"
                            aria-label={t('customer.aboutAwayInAStraightLine', { distance: distance })}
                          >
                            <Navigation
                              size={12}
                              aria-hidden="true"
                            />
                            {`≈ ${distance}`}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                        {formatLockerAddress(locker)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          {t('customer.compartmentsAvailable', { availableSlotCount: locker.availableSlotCount })}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-lg"
                          disabled={!hasCoordinates(locker)}
                          aria-pressed={selectedId === locker.id}
                          onClick={() => selectLocker(locker.id, true)}
                        >
                          <MapPin size={14} />
                          {t('customer.showOnMap')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => setDetailId(locker.id)}
                        >
                          {t('customer.details')}
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
      {detailId && (
        <LockerDetails
          id={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  )
}
