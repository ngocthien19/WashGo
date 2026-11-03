import { useCallback } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, MapPinned } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { CUSTOMER_CATALOG, CUSTOMER_ROUTES } from '~/utils/constants'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import LockerResults from '~/components/customer/lockers/LockerResults'
import LocationButton from '~/components/customer/lockers/LocationButton'

export default function NearbyLockers() {
  const { position, locating, locationError, requestLocation } = useOutletContext()
  const load = useCallback((signal) => customerCatalogApi.getLockers({
    page: CUSTOMER_CATALOG.INITIAL_PAGE,
    take: CUSTOMER_CATALOG.FEATURED_LIMIT,
    ...position
  }, signal), [position])
  const { data, loading, error, retry } = useCatalogResource(load)
  const lockers = data?.list || []
  return (
    <section
      id="lockers"
      aria-labelledby="nearby-lockers-heading"
      className="scroll-mt-[var(--customer-header-offset)] bg-muted/35"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <SectionHeading
            id="nearby-lockers-heading"
            title="Locker gần bạn"
            description={position ? 'Các locker khả dụng gần vị trí của bạn nhất.' : 'Tìm điểm gửi đồ thuận tiện. Dùng vị trí để xem locker gần nhất.'}
            icon={MapPinned}
          />
          <div className="flex flex-wrap gap-3">
            <LocationButton
              locating={locating}
              onClick={requestLocation}
            />
            <Button
              render={<Link to={CUSTOMER_ROUTES.LOCKERS} />}
              nativeButton={false}
              variant="outline"
              className="h-11 rounded-full"
            >
              Xem tất cả locker
              <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Button>
          </div>
        </Reveal>
        {locationError && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300"
          >
            {locationError}
          </p>
        )}
        {loading || error || !lockers.length ? (
          <CatalogFeedback
            loading={loading}
            loadingText="Đang tải locker..."
            error={error}
            retry={retry}
            empty="Hiện chưa có locker khả dụng."
          />
        ) : (
          <LockerResults
            lockers={lockers}
            position={position}
          />
        )}
      </div>
    </section>
  )
}
