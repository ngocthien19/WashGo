import { useCallback, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, PanelsTopLeft, RefreshCw } from 'lucide-react'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import LockerMap from '~/components/customer/lockers/LockerMap'
import LocationButton from '~/components/maps/LocationButton'
import Pagination from '~/components/Pagination/Pagination'
import FormError from '~/components/ui/FormError'
import { Button } from '~/components/ui/button'
import { CUSTOMER_CATALOG, LOCKER_SLOT_SIZES, ORDER_CHOICE_STYLES } from '~/utils/constants'
import { formatDistance, formatLockerAddress } from '~/utils/formats'
import SelectionBadge from './SelectionBadge'

export default function OrderLocker({ locker, box, onLocker, onBox }) {
  const { t } = useTranslation()
  const { position, locating, locationError, requestLocation } = useOutletContext()
  const [query, setQuery] = useState({ keyword: '', page: 1 })
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [slotFilter, setSlotFilter] = useState('available')
  const load = useCallback((signal) => customerCatalogApi.getLockers({ ...query, take: CUSTOMER_CATALOG.PAGE_SIZE, ...position }, signal), [query, position])
  const list = useCatalogResource(load)
  const loadDetail = useCallback((signal) => locker ? customerCatalogApi.getLocker(locker.id, signal) : Promise.resolve(null), [locker])
  const detail = useCatalogResource(loadDetail)
  const lockers = list.data?.list || []
  const choose = (id) => {
    const next = lockers.find((item) => item.id === id)
    if (next) {
      onLocker(next)
      setSlotFilter('available')
      setSelectionVersion((value) => value + 1)
    }
  }
  return (
    <div className="space-y-6">
      <CatalogToolbar
        keyword={query.keyword}
        label={t('customer.order.findLockers')}
        placeholder={t('customer.order.findLockers')}
        onSearch={(keyword) => setQuery({ keyword, page: 1 })}
        actions={(
          <LocationButton
            locating={locating}
            onClick={async () => {
              const next = await requestLocation()
              if (next) {
                setQuery((current) => ({ ...current, page: 1 }))
              }
            }}
          />
        )}
      />
      <FormError>
        {locationError}
      </FormError>
      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LockerMap
          lockers={locker && !lockers.some((item) => item.id === locker.id) ? [...lockers, locker] : lockers}
          selectedId={locker?.id}
          selectionVersion={selectionVersion}
          onSelect={(id) => id === locker?.id ? setSelectionVersion((value) => value + 1) : choose(id)}
          position={position}
        />
        <div className="min-w-0 space-y-3">
          {list.loading || list.error || !lockers.length ? (
            <CatalogFeedback
              {...list}
              empty="customer.order.noLockers"
              loadingText="customer.order.loadingLockers"
            />
          ) : lockers.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              aria-pressed={locker?.id === item.id}
              onClick={() => choose(item.id)}
              className={`relative h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-2xl border border-border bg-card p-4 text-left ${ORDER_CHOICE_STYLES}`}
            >
              <MapPin className="order-choice-primary mt-1 text-primary" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="flex justify-between gap-2">
                  <span className="text-base line-clamp-2 font-semibold [overflow-wrap:anywhere]">
                    {item.name}
                  </span>
                  {position && Number.isFinite(item.distanceKm) && (
                    <span className="order-choice-primary shrink-0 text-xs text-primary">
                      ≈
                      {' '}
                      {formatDistance(item.distanceKm)}
                    </span>
                  )}
                </span>
                <span className="order-choice-muted block line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {formatLockerAddress(item)}
                </span>
                <span className="order-choice-availability inline-block rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                  {t('customer.compartmentsAvailable', { availableSlotCount: item.availableSlotCount })}
                </span>
              </span>
              {locker?.id === item.id && (
                <SelectionBadge />
              )}
            </Button>
          ))}
          <Pagination
            currentPage={query.page}
            totalPages={list.data?.totalPages || 0}
            disabled={list.loading}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </div>
      </div>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PanelsTopLeft className="text-violet-600 dark:text-violet-300" />
            {t('customer.order.chooseBox')}
          </h2>
          <div
            role="group"
            aria-label={t('customer.order.slotFilter')}
            className="flex flex-wrap gap-2"
          >
            <Button
              variant="ghost"
              aria-pressed={slotFilter === 'available'}
              className="rounded-full border border-emerald-500/20 px-3 text-emerald-700 aria-pressed:bg-emerald-500/10 [&:hover]:bg-emerald-500/15 [&:hover]:text-emerald-800 dark:text-emerald-300 dark:[&:hover]:text-emerald-200"
              onClick={() => setSlotFilter('available')}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              {t('customer.order.available')}
            </Button>
            <Button
              variant="ghost"
              aria-pressed={slotFilter === 'selected'}
              className="rounded-full border border-violet-500/20 px-3 text-violet-700 aria-pressed:bg-violet-500/10 [&:hover]:bg-violet-500/15 [&:hover]:text-violet-800 dark:text-violet-300 dark:[&:hover]:text-violet-200"
              onClick={() => setSlotFilter('selected')}
            >
              <span className="size-2 rounded-full bg-violet-500" />
              {t('customer.order.selecting')}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full border border-red-500/20 px-3 text-red-700 aria-pressed:bg-red-500/10 [&:hover]:bg-red-500/15 [&:hover]:text-red-800 dark:text-red-300 dark:[&:hover]:text-red-200"
              aria-pressed={slotFilter === 'occupied'}
              onClick={() => setSlotFilter('occupied')}
            >
              <span className="size-2 rounded-full bg-red-500" />
              {t('customer.order.occupied')}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {locker ? `${locker.name} · ${t('customer.order.reservationNote')}` : t('customer.order.chooseLockerFirst')}
        </p>
        {locker && (
          <Button
            variant="secondary"
            className="mt-4 h-9"
            disabled={detail.loading}
            onClick={detail.retry}
          >
            <RefreshCw size={15} />
            {t('customer.order.refreshBoxes')}
          </Button>
        )}
        {locker && (detail.loading || detail.error || !detail.data?.availableSlots?.length ? (
          <div className="mt-4">
            <CatalogFeedback
              {...detail}
              empty="customer.order.noBoxes"
              loadingText="customer.order.loadingBoxes"
            />
          </div>
        ) : (
          <div
            role="group"
            aria-label={t('customer.order.chooseBox')}
            className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12"
          >
            {(slotFilter === 'occupied' || (slotFilter === 'selected' && !detail.data.availableSlots.some((slot) => slot.id === box?.id))) && (
              <p
                role="status"
                className="col-span-full rounded-xl bg-violet-500/5 p-5 text-sm text-muted-foreground"
              >
                {t(slotFilter === 'occupied' ? 'customer.order.occupiedUnavailable' : 'customer.order.noSelectedBox')}
              </p>
            )}
            {detail.data.availableSlots.filter((slot) => slotFilter === 'available' || (slotFilter === 'selected' && slot.id === box?.id)).map((slot) => (
              <Button
                key={slot.id}
                variant="ghost"
                aria-label={`${t('customer.order.box', { number: slot.slotNumber })} ${t(LOCKER_SLOT_SIZES[slot.size] || 'customer.order.unknownSize')}`}
                aria-pressed={box?.id === slot.id}
                onClick={() => onBox(slot)}
                className="relative h-auto min-h-18 min-w-0 flex-col gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-3 [&:hover]:bg-emerald-500/10 aria-pressed:border-violet-500 aria-pressed:bg-violet-500/8 aria-pressed:text-violet-700 aria-pressed:[&:hover]:bg-violet-500/15 dark:aria-pressed:text-violet-300"
              >
                <span className="text-sm font-semibold">
                  {t('customer.order.boxShort', { number: slot.slotNumber })}
                </span>
                <span className="max-w-full whitespace-normal text-xs font-normal leading-4">
                  {t(LOCKER_SLOT_SIZES[slot.size] || 'customer.order.unknownSize')}
                </span>
                {box?.id === slot.id && (
                  <SelectionBadge className="bg-violet-600" />
                )}
              </Button>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
