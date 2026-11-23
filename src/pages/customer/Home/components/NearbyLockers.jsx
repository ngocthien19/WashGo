import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPinned } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { Button } from '~/components/ui/button'

import ScrollAccent from '~/components/motion/ScrollAccent'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_ROUTES, NEARBY_LOCKERS } from '~/utils/config/constants'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import LockerResults from '~/components/customer/lockers/LockerResults'
import SectionGlow from '~/components/customer/SectionGlow/SectionGlow'

export default function NearbyLockers() {
  const { t } = useTranslation()
  const load = useCallback(signal => customerCatalogApi.getLockers({ page: 1, take: NEARBY_LOCKERS.TAKE }, signal), [])
  const { data, loading, error, retry } = useCatalogResource(load)
  const lockers = data?.list || []
  return (
    <section
      id="lockers"
      aria-labelledby="nearby-lockers-heading"
      className="relative isolate scroll-mt-[var(--customer-header-offset)] overflow-hidden bg-muted/35"
    >
      <SectionGlow side="right" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <ScrollAccent
            className="min-w-0"
          >
            <SectionHeading
              id="nearby-lockers-heading"
              title={t('nearbyLockers.homeTitle')}
              description={t('nearbyLockers.homeDescription')}
              descriptionClassName="text-base"
              icon={MapPinned}
            />
          </ScrollAccent>
          <div className="flex flex-wrap gap-3">
            <Button
              render={<Link to={CUSTOMER_ROUTES.LOCKERS} />}
              nativeButton={false}
              variant="secondary"
              className="h-11 rounded-full px-5 text-base"
            >
              {t('customer.viewAllLockers')}
              <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Button>
          </div>
        </div>
        {loading || error || !lockers.length ? (
          <CatalogFeedback
            loading={loading}
            loadingText={t('customer.loadingLockers')}
            error={error}
            retry={retry}
            empty={t('customer.noLockersAreAvailableRightNow')}
          />
        ) : (
          <LockerResults
            animate
            lockers={lockers}
          />
        )}
      </div>
    </section>
  )
}
