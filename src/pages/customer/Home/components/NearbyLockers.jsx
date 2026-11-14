import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, MapPinned } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { Button } from '~/components/ui/button'

import ScrollAccent from '~/components/motion/ScrollAccent'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_CATALOG, CUSTOMER_ROUTES } from '~/utils/config/constants'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import LockerResults from '~/components/customer/lockers/LockerResults'
import LocationButton from '~/components/maps/LocationButton'
import SectionGlow from './SectionGlow'

export default function NearbyLockers({ embedded = false, excludeIds = [] }) {
  const { t } = useTranslation()
  const { position, locating, locationError, requestLocation } = useOutletContext()
  const excluded = excludeIds.join(',')
  const load = useCallback((signal) => embedded && !position ? Promise.resolve(null) : customerCatalogApi.getLockers({
    page: CUSTOMER_CATALOG.INITIAL_PAGE,
    take: embedded ? Math.min(50, 4 + excluded.split(',').filter(Boolean).length) : CUSTOMER_CATALOG.FEATURED_LIMIT,
    ...position
  }, signal), [position, embedded, excluded])
  const { data, loading, error, retry } = useCatalogResource(load)
  const excludedIds = new Set(excludeIds)
  const lockers = (data?.list || []).filter((locker) => !excludedIds.has(locker.id)).slice(0, embedded ? 4 : CUSTOMER_CATALOG.FEATURED_LIMIT)
  return (
    <section
      id="lockers"
      aria-labelledby="nearby-lockers-heading"
      className={`relative isolate scroll-mt-[var(--customer-header-offset)] overflow-hidden bg-muted/35 ${embedded ? 'rounded-3xl border border-border' : ''}`}
    >
      <SectionGlow side="right" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <ScrollAccent
            disabled={embedded}
            className="min-w-0"
          >
            <SectionHeading
              id="nearby-lockers-heading"
              title={t('customer.lockersNearYou')}
              description={position ? t('customer.availableLockersClosestToYourLocation') : t('customer.findAConvenientDropOffPointUseYourLocation')}
              descriptionClassName="text-base"
              icon={MapPinned}
            />
          </ScrollAccent>
          <div className="flex flex-wrap gap-3">
            <LocationButton
              locating={locating}
              onClick={requestLocation}
            />
            {!embedded && (
              <Button
                render={<Link to={CUSTOMER_ROUTES.LOCKERS} />}
                nativeButton={false}
                variant="secondary"
                className="h-11 rounded-full px-5 text-base"
              >
                {t('customer.viewAllLockers')}
                <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
              </Button>
            )}
          </div>
        </div>
        {locationError && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300"
          >
            {t(locationError)}
          </p>
        )}
        {embedded && !position ? (
          <p className="rounded-2xl border border-dashed border-primary/20 bg-card p-6 text-muted-foreground">
            {t('catalogUi.nearbyOptIn')}
          </p>
        ) : loading || error || !lockers.length ? (
          <CatalogFeedback
            loading={loading}
            loadingText={t('customer.loadingLockers')}
            error={error}
            retry={retry}
            empty={t('customer.noLockersAreAvailableRightNow')}
          />
        ) : (
          <LockerResults
            animate={!embedded}
            lockers={lockers}
            position={position}
          />
        )}
      </div>
    </section>
  )
}
