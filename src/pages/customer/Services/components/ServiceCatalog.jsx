import { useTranslation } from 'react-i18next'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { CUSTOMER_CATALOG, SERVICE_PRICE_RANGES, SERVICE_TYPES } from '~/utils/constants'
import { formatCurrency } from '~/utils/formats'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ServiceGrid from '~/components/customer/services/ServiceGrid'
import Pagination from '~/components/Pagination/Pagination'
import useCatalogResource from '~/hooks/useCatalogResource'
import ServiceFilters from './ServiceFilters'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import CatalogResultSummary from '~/components/customer/catalog/CatalogResultSummary'
import ServiceSort from './ServiceSort'
import { buildServiceFilter, initialServiceQuery, readServiceQuery, writeServiceQuery } from '../serviceCatalogQuery'

export default function ServiceCatalog() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => readServiceQuery(searchParams), [searchParams])
  const load = useCallback((signal) => customerCatalogApi.getServices(buildServiceFilter(query), signal), [query])
  const { data, loading, error, retry } = useCatalogResource(load)
  const services = data?.list || []
  const hasFilters = !!(query.keyword || query.serviceTypes.length || query.priceRanges.length || query.minPrice || query.maxPrice)
  const priceRange = SERVICE_PRICE_RANGES.find((range) => range.minPrice === query.minPrice && range.maxPrice === query.maxPrice)
  const priceLabel = priceRange ? t(priceRange.label) : query.minPrice && query.maxPrice
    ? t('customer.serviceCatalog.customBetween', { min: formatCurrency(query.minPrice), max: formatCurrency(query.maxPrice) })
    : t(query.minPrice ? 'customer.serviceCatalog.customFrom' : 'customer.serviceCatalog.customTo', {
      price: formatCurrency(query.minPrice || query.maxPrice)
    })
  const filters = [
    query.keyword && { id: 'keyword', label: t('customer.keywordFilter', { keyword: query.keyword }) },
    ...query.serviceTypes.map((value) => ({ id: `type:${value}`, label: t(SERVICE_TYPES.find((type) => type.value === value).label) })),
    ...query.priceRanges.map((value) => ({ id: `range:${value}`, label: t(SERVICE_PRICE_RANGES.find((range) => range.value === value).label) })),
    (query.minPrice || query.maxPrice) && { id: 'price', label: priceLabel }
  ].filter(Boolean)
  const firstResult = services.length ? (data.currentPage - 1) * (data.pageSize || CUSTOMER_CATALOG.PAGE_SIZE) + 1 : 0
  const lastResult = services.length ? firstResult + services.length - 1 : 0

  const setQuery = (update) => {
    const next = typeof update === 'function' ? update(query) : update
    setSearchParams(writeServiceQuery(next))
  }
  const clearFilters = () => setQuery({ ...initialServiceQuery, sort: query.sort })

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
    >
      <h1
        id="services-heading"
        className="sr-only"
      >
        {t('customer.allServices')}
      </h1>
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
        <ServiceFilters
          values={query.serviceTypes}
          priceRanges={query.priceRanges}
          minPrice={query.minPrice}
          maxPrice={query.maxPrice}
          priceLabel={priceLabel}
          onPriceApply={(ranges) => setQuery((current) => ({ ...current, priceRanges: ranges.filter((value) => value !== 'custom'),
            minPrice: ranges.includes('custom') ? current.minPrice : '', maxPrice: ranges.includes('custom') ? current.maxPrice : '', page: CUSTOMER_CATALOG.INITIAL_PAGE }))}
          onChange={(serviceTypes) => setQuery((current) => ({ ...current, serviceTypes, page: CUSTOMER_CATALOG.INITIAL_PAGE }))}
          onReset={clearFilters}
          hasFilters={hasFilters}
        />
        <div className="min-w-0 space-y-6">
          <div
            data-pagination-scope
            className="scroll-mt-[var(--customer-header-offset)]"
            aria-busy={loading}
          >
            <div className="mb-6">
              <CatalogResultSummary
                count={!loading && !error ? data?.total || 0 : undefined}
                title={loading ? t('customer.loadingServices') : error ? t('customer.serviceList') : t('customer.servicesFound', { count: data?.total || 0 })}
                sortControl={(
                  <ServiceSort
                    value={query.sort}
                    onChange={(sort) => setQuery((current) => ({ ...current, sort, page: CUSTOMER_CATALOG.INITIAL_PAGE }))}
                  />
                )}
                range={!loading && !error && services.length > 0
                  ? t('customer.showing', { firstResult, lastResult, total: data.total }) : undefined}
                filters={filters}
                onRemoveFilter={(id) => setQuery((current) => ({
                  ...current,
                  ...(id.startsWith('type:') ? { serviceTypes: current.serviceTypes.filter((value) => `type:${value}` !== id) }
                    : id.startsWith('range:') ? { priceRanges: current.priceRanges.filter((value) => `range:${value}` !== id) }
                      : id === 'price' ? { minPrice: '', maxPrice: '' } : { keyword: '' }),
                  page: CUSTOMER_CATALOG.INITIAL_PAGE
                }))}
                onClearFilters={clearFilters}
              />
            </div>
            {loading || error || !services.length ? (
              <CatalogFeedback
                loading={loading}
                error={error}
                retry={retry}
                empty={hasFilters ? t('customer.noMatchingServicesTryAnotherKeywordOrServiceType') : undefined}
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
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
