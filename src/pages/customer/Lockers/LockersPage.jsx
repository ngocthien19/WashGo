import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { ArrowDownAZ, Check, ChevronDown, ChevronRight, LocateFixed, MapPinned } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import LockerResultSummary from './components/LockerResultSummary'
import { Button } from '~/components/ui/button'
import LockerAreaFilters from './components/LockerAreaFilters'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import LockerResults from '~/components/customer/lockers/LockerResults'
import LocationButton from '~/components/customer/lockers/LocationButton'
import Pagination from '~/components/Pagination/Pagination'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { CUSTOMER_CATALOG, CUSTOMER_ROUTES, TEXT_LINK_STYLES } from '~/utils/constants'

export default function LockersPage() {
  const { position, locating, locationError, requestLocation } = useOutletContext()
  const [sort, setSort] = useState(position ? 'nearest' : 'name')
  const [params, setParams] = useSearchParams()
  const resultsRef = useRef(null)
  const active = useRef(true)
  const query = useMemo(() => {
    const page = Number(params.get('page'))
    return {
      keyword: params.get('keyword')?.trim() || '',
      city: params.get('city')?.trim() || '',
      district: params.get('district')?.trim() || '',
      page: Number.isSafeInteger(page) && page > 0 ? page : CUSTOMER_CATALOG.INITIAL_PAGE
    }
  }, [params])
  const load = useCallback((signal) => customerCatalogApi.getLockers({
    page: query.page,
    take: CUSTOMER_CATALOG.PAGE_SIZE,
    keyword: query.keyword || undefined,
    city: query.city || undefined,
    district: query.district || undefined,
    ...(sort === 'nearest' ? position : {})
  }, signal), [query, sort, position])
  const { data, loading, error, retry } = useCatalogResource(load)
  const areas = useCatalogResource(customerCatalogApi.getLockerAreas)
  const lockers = data?.list || []
  const hasFilters = !!(query.keyword || query.city || query.district)
  const setQuery = (update) => {
    setParams((current) => {
      const search = new URLSearchParams(current)
      for (const [key, value] of Object.entries(update)) {
        if (value && (key !== 'page' || value > CUSTOMER_CATALOG.INITIAL_PAGE)) {
          search.set(key, String(value))
        } else {
          search.delete(key)
        }
      }
      return search
    })
  }
  const useNearest = async () => {
    const next = await requestLocation()
    if (next && active.current) {
      setSort('nearest')
      setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
    }
  }

  useEffect(() => {
    active.current = true
    document.title = 'Tất cả locker | WashGo'
    window.scrollTo({ top: 0, behavior: 'instant' })
    return () => {
      active.current = false
    }
  }, [])

  return (
    <div className="min-h-[70dvh] bg-muted/35">
      <div className="mx-auto max-w-7xl space-y-7 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Đường dẫn trang"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link
            to={CUSTOMER_ROUTES.HOME}
            className={`hover:text-primary ${TEXT_LINK_STYLES}`}
          >
            Trang chủ
          </Link>
          <ChevronRight size={14} />
          <span
            aria-current="page"
            className="font-semibold text-foreground"
          >
            Tất cả locker
          </span>
        </nav>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <SectionHeading
            as="h1"
            title="Tìm locker của bạn"
            description="Chọn điểm gửi đồ thuận tiện và xem các ô trống hiện tại."
            icon={MapPinned}
          />
          <LocationButton
            locating={locating}
            onClick={useNearest}
          />
        </div>
        <CatalogToolbar
          keyword={query.keyword}
          label="Tìm locker"
          placeholder="Tìm theo tên, mã hoặc địa chỉ locker..."
          onSearch={(keyword) => setQuery({ keyword, page: CUSTOMER_CATALOG.INITIAL_PAGE })}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(
                <Button
                  variant="outline"
                  className="min-w-36 justify-between rounded-xl"
                />
              )}
              aria-label="Sắp xếp locker"
              disabled={locating}
            >
              {sort === 'nearest' ? 'Gần nhất' : 'Tên A–Z'}
              <ChevronDown size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  setSort('name')
                  setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
                }}
              >
                <ArrowDownAZ size={16} />
                Tên A–Z
                {sort === 'name' && (
                  <Check className="ml-auto size-4 text-primary" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={useNearest}>
                <LocateFixed size={16} />
                Gần nhất
                {sort === 'nearest' && (
                  <Check className="ml-auto size-4 text-primary" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CatalogToolbar>
        <LockerAreaFilters
          key={`${query.city}:${query.district}`}
          city={query.city}
          district={query.district}
          hasFilters={hasFilters}
          resource={areas}
          onApply={(areas) => setQuery({ ...areas, page: CUSTOMER_CATALOG.INITIAL_PAGE })}
          onReset={() => setQuery({ keyword: '', city: '', district: '', page: CUSTOMER_CATALOG.INITIAL_PAGE })}
        />
        {locationError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300"
          >
            {locationError}
          </p>
        )}
        <section
          ref={resultsRef}
          aria-label="Kết quả tìm locker"
          aria-busy={loading}
          className="scroll-mt-[var(--customer-header-offset)] space-y-5"
        >
          <LockerResultSummary
            data={data}
            loading={loading}
            error={error}
            keyword={query.keyword}
            sort={sort}
          />
          {loading || error || !lockers.length ? (
            <CatalogFeedback
              loading={loading}
              loadingText="Đang tải locker..."
              error={error}
              retry={retry}
              empty={hasFilters ? 'Không có locker phù hợp. Hãy thử từ khóa hoặc khu vực khác.' : 'Hiện chưa có locker khả dụng.'}
            />
          ) : (
            <LockerResults
              lockers={lockers}
              position={position}
            />
          )}
          {!loading && !error && data?.totalPages > 0 && (
            <Pagination
              className="pt-5"
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={(page) => {
                setQuery({ page })
                resultsRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}
