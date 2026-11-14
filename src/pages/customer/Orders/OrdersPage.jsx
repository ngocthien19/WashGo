import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, Plus, RefreshCw } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import CatalogResultSummary from '~/components/customer/catalog/CatalogResultSummary'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import useOrderEstimates from '~/hooks/customer/useOrderEstimates'
import { CUSTOMER_ROUTES, ORDER_LIST, ORDER_SORT_OPTIONS, ORDER_STATUS_OPTIONS, PAYMENT_STATUSES } from '~/utils/constants'
import OrderCard from './components/OrderCard'
import { buildOrdersFilter, initialOrdersQuery, readOrdersQuery, writeOrdersQuery } from './ordersQuery'

export default function OrdersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readOrdersQuery(params), [params])
  const load = useCallback((signal) => customerOrderApi.list(buildOrdersFilter(query), signal), [query])
  const resource = useCatalogResource(load)
  const { data, loading, error, retry } = resource
  const estimates = useOrderEstimates(data?.list)
  const setQuery = (patch) => setParams(writeOrdersQuery({ ...query, ...patch, page: patch.page || 1 }))
  useEffect(() => {
    document.title = `${t('common.myOrders')} | WashGo`
  }, [t])
  const statusOptions = [{ value: '', label: t('common.all') }, ...ORDER_STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))]
  const paymentOptions = [{ value: '', label: t('common.all') }, ...Object.values(PAYMENT_STATUSES).map((value) => ({ value: String(value), label: t(`customer.orders.paymentStatus.${value}`) }))]
  const filters = [
    query.keyword && { id: 'keyword', label: t('customer.keywordFilter', { keyword: query.keyword }) },
    query.status && { id: 'status', label: statusOptions.find((option) => option.value === query.status).label },
    query.paymentStatus && { id: 'paymentStatus', label: paymentOptions.find((option) => option.value === query.paymentStatus).label }
  ].filter(Boolean)
  const firstResult = data?.list.length ? (data.currentPage - 1) * (data.pageSize || ORDER_LIST.PAGE_SIZE) + 1 : 0
  return (
    <div className="min-h-[70dvh] bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('common.myOrders') }]} />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <SectionHeading
            as="h1"
            icon={ClipboardList}
            title={t('common.myOrders')}
            description={t('customer.orders.description')}
          />
          <Button
            render={<Link to={CUSTOMER_ROUTES.CREATE_ORDER} />}
            nativeButton={false}
            className="h-11 rounded-xl"
          >
            <Plus size={18} />
            {t('common.createAnOrder')}
          </Button>
        </div>
        <div className="grid items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.5fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_auto]">
          <CatalogToolbar
            suggestionType="order"
            suggestionFilter={buildOrdersFilter(query)}
            embedded
            className="pt-2 sm:col-span-2 lg:col-span-1"
            keyword={query.keyword}
            label={t('customer.orders.search')}
            placeholder={t('customer.orders.searchPlaceholder')}
            onSearch={(keyword) => setQuery({ keyword })}
          />
          {[{ id: 'status', label: 'customer.orders.orderStatus', options: statusOptions }, { id: 'paymentStatus', label: 'customer.orders.paymentLabel', options: paymentOptions }].map((field) => (
            <div
              key={field.id}
              className="relative pt-2"
            >
              <label
                htmlFor={`orders-${field.id}`}
                className="absolute -top-1 left-3 z-10 bg-card px-1 text-xs font-medium text-muted-foreground"
              >
                {t(field.label)}
              </label>
              <SelectField
                id={`orders-${field.id}`}
                label={t(field.label)}
                value={query[field.id]}
                onValueChange={(value) => setQuery({ [field.id]: value })}
                options={field.options}
              />
            </div>
          ))}
          <div className="flex items-center pt-2">
            <Button
              variant="outline"
              className="h-11"
              disabled={loading}
              onClick={retry}
            >
              <RefreshCw size={16} />
              {t('customer.orders.refresh')}
            </Button>
          </div>
        </div>
        <div
          data-pagination-scope
          aria-busy={loading}
          className="scroll-mt-[var(--customer-header-offset)] space-y-5"
        >
          <CatalogResultSummary
            icon={ClipboardList}
            count={!loading && !error ? data?.total || 0 : undefined}
            title={t(loading ? 'customer.orders.loading' : error ? 'common.myOrders' : 'customer.orders.foundLabel', { count: data?.total || 0 })}
            range={!loading && !error && data?.list.length ? t('customer.showing', { firstResult, lastResult: firstResult + data.list.length - 1, total: data.total }) : undefined}
            sortControl={(
              <SelectField
                label={t('customer.orders.sort')}
                value={query.sort}
                onValueChange={(sort) => setQuery({ sort })}
                options={ORDER_SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))}
                className="w-44"
              />
            )}
            filters={filters}
            onRemoveFilter={(id) => setQuery({ [id]: '' })}
            onClearFilters={() => setParams(writeOrdersQuery({ ...initialOrdersQuery, sort: query.sort }))}
          />
          <h2 className="border-b-2 border-border pb-4 pt-2 text-center text-lg font-semibold">
            {t('customer.orders.listTitle')}
          </h2>
          {loading || error || !data?.list.length ? (
            <CatalogFeedback
              {...resource}
              loadingText="customer.orders.loading"
              empty={filters.length ? 'customer.orders.noMatches' : 'customer.orders.empty'}
            />
          ) : data.list.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              estimate={estimates[order.id]}
            />
          ))}
          {!loading && !error && data?.totalPages > 0 && (
            <Pagination
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={(page) => {
                setQuery({ page })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
