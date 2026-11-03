import { useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { CUSTOMER_CATALOG, SERVICE_TYPES } from '~/utils/constants'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import ServiceGrid from '~/components/customer/services/ServiceGrid'
import Pagination from '~/components/Pagination/Pagination'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import ServiceFilters from './ServiceFilters'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'

const initialQuery = { keyword: '', serviceType: '', page: CUSTOMER_CATALOG.INITIAL_PAGE }

export default function ServiceCatalog() {
  const resultsRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => {
    const page = Number(searchParams.get('page'))
    const serviceType = searchParams.get('serviceType') || ''
    return {
      keyword: searchParams.get('keyword')?.trim() || '',
      serviceType: SERVICE_TYPES.some((type) => type.value === serviceType) ? serviceType : '',
      page: Number.isSafeInteger(page) && page >= CUSTOMER_CATALOG.INITIAL_PAGE ? page : CUSTOMER_CATALOG.INITIAL_PAGE
    }
  }, [searchParams])
  const load = useCallback((signal) => customerCatalogApi.getServices({
    ...query,
    keyword: query.keyword || undefined,
    serviceType: query.serviceType || undefined,
    take: CUSTOMER_CATALOG.PAGE_SIZE
  }, signal), [query])
  const { data, loading, error, retry } = useCatalogResource(load)
  const services = data?.list || []
  const hasFilters = !!(query.keyword || query.serviceType)
  const firstResult = services.length ? (data.currentPage - 1) * (data.pageSize || CUSTOMER_CATALOG.PAGE_SIZE) + 1 : 0
  const lastResult = services.length ? firstResult + services.length - 1 : 0

  const setQuery = (update) => {
    const next = typeof update === 'function' ? update(query) : update
    const params = new URLSearchParams()
    if (next.keyword) {
      params.set('keyword', next.keyword)
    }
    if (next.serviceType) {
      params.set('serviceType', next.serviceType)
    }
    if (next.page > CUSTOMER_CATALOG.INITIAL_PAGE) {
      params.set('page', String(next.page))
    }
    setSearchParams(params)
  }

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
    >
      <h1
        id="services-heading"
        className="sr-only"
      >
        Tất cả dịch vụ
      </h1>
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
        <ServiceFilters
          value={query.serviceType}
          onChange={(serviceType) => setQuery((current) => ({ ...current, serviceType, page: CUSTOMER_CATALOG.INITIAL_PAGE }))}
          onReset={() => setQuery(initialQuery)}
          hasFilters={hasFilters}
        />
        <div className="min-w-0 space-y-6">
          <CatalogToolbar
            keyword={query.keyword}
            label="Tìm dịch vụ"
            placeholder="Tìm dịch vụ theo tên hoặc mã..."
            onSearch={(keyword) => setQuery({ ...query, keyword, page: CUSTOMER_CATALOG.INITIAL_PAGE })}
          />
          <div
            ref={resultsRef}
            className="scroll-mt-[var(--customer-header-offset)]"
            aria-busy={loading}
          >
            <div className="mb-6 flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-5 py-5 shadow-sm sm:px-6">
              <p
                role="status"
                className="text-sm text-muted-foreground sm:text-base"
              >
                {loading ? 'Đang tải dịch vụ...' : error ? 'Danh sách dịch vụ' : (
                  <>
                    <strong className="mr-2 text-xl font-bold text-foreground">
                      {data?.total || 0}
                    </strong>
                    dịch vụ tìm thấy
                  </>
                )}
              </p>
              {!loading && !error && services.length > 0 && (
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {`Hiển thị ${firstResult}–${lastResult} / ${data.total}`}
                </p>
              )}
              {query.keyword && (
                <p className="w-full break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  Kết quả cho “
                  <strong className="font-semibold text-primary">
                    {query.keyword}
                  </strong>
                  ”
                </p>
              )}
            </div>
            {loading || error || !services.length ? (
              <CatalogFeedback
                loading={loading}
                error={error}
                retry={retry}
                empty={hasFilters ? 'Không có dịch vụ phù hợp. Hãy thử từ khóa hoặc loại dịch vụ khác.' : undefined}
              />
            ) : (
              <ServiceGrid
                services={services}
                className="lg:grid-cols-2 xl:grid-cols-3"
              />
            )}
            {!loading && !error && data?.totalPages > 0 && (
              <Pagination
                className="mt-10"
                currentPage={data.currentPage}
                totalPages={data.totalPages}
                onPageChange={(page) => {
                  setQuery((current) => ({ ...current, page }))
                  resultsRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
