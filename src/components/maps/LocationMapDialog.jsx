import { lazy, Suspense, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { MapPin, ExternalLink, Route } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button, buttonVariants } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { getLockerMapLink, getLockerDirectionsLink, getDistanceKm, formatDistance, hasCoordinates } from '~/utils/format/formats'
import useGeolocation from '~/hooks/useGeolocation'
import LocationButton from './LocationButton'
import FormError from '~/components/ui/FormError'
import { cn } from '~/lib/utils'

const LockerMap = lazy(() => import('~/components/customer/lockers/LockerMap'))

// Read-only location preview: opening this dialog never launches an external map or requests geolocation.
export default function LocationMapDialog({ location, loading = false, error, onRetry, onClose }) {
  const { t } = useTranslation()
  const { position, locating, locationError, requestLocation } = useGeolocation()
  const lockers = useMemo(() => location ? [{ ...location, id: location.id || 'location' }] : [], [location])
  const distance = getDistanceKm(position, location)
  const directionsHref = getLockerDirectionsLink(location, position)
  const href = location && (getLockerMapLink(location) || (location.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([location.name, location.address].filter(Boolean).join(', '))}` : null))
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        ready={!loading}
        className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden [&_button]:text-base"
        closeLabel="common.close"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <MapPin />
            {t('customer.lockerLocationMap')}
          </DialogTitle>
          <DialogDescription className="mt-3 break-words text-base text-muted-foreground">
            {[location?.name, location?.address].filter(Boolean).join(' · ') || '—'}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 min-h-0 space-y-3 overflow-y-auto">
          {!error && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
                <p className="flex-1 basis-48 text-sm text-muted-foreground">
                  {distance !== null ? (
                    <Trans
                      i18nKey="customer.mapDistance"
                      values={{ distance: formatDistance(distance) }}
                      components={{ strong: <strong className="font-bold text-foreground" /> }}
                    />
                  ) : t('customer.allowLocationForDistance')}
                </p>
                <LocationButton
                  locating={locating}
                  onClick={requestLocation}
                />
              </div>
              <FormError>
                {locationError}
              </FormError>
              {position && !hasCoordinates(location) && (
                <p className="text-sm text-muted-foreground">
                  {t('customer.lockerCoordinatesAreNotAvailableYet')}
                </p>
              )}
            </>
          )}
          {error ? (
            <ResourceFeedback
              error={error}
              retry={onRetry}
            />
          ) : (
            <Suspense fallback={(
              <div className="h-[clamp(200px,35dvh,360px)]">
                <ResourceFeedback
                  loading
                  loadingText="customer.addressMap.loading"
                />
              </div>
            )}
            >
              <LockerMap
                lockers={lockers}
                selectedId={lockers[0]?.id}
                showAvailability={false}
                position={position}
                fitPosition
                openSelectedPopup={false}
                heightClassName="h-[clamp(200px,35dvh,360px)]"
              />
            </Suspense>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border pt-4">
          <Button
            variant="secondary"
            className="h-11 px-5 text-base"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
          {!error && href && (
            <a
              className={cn(buttonVariants({ variant: 'outline-primary' }), 'h-11 px-5 text-base')}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={18} />
              {t('customer.openGoogleMaps')}
            </a>
          )}
          {!error && directionsHref && (
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 bg-emerald-500/10 px-5 text-base text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300')}
            >
              <Route size={18} />
              {t('customer.mapDirections')}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
