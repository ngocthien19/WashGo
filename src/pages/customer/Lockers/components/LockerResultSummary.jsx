import { useTranslation } from 'react-i18next'
import { MapPinned } from 'lucide-react'
import CatalogResultSummary from '~/components/customer/catalog/CatalogResultSummary'
import { CUSTOMER_CATALOG } from '~/utils/constants'

export default function LockerResultSummary({ data, loading, error, query, sortControl, onRemoveFilter, onClearFilters }) {
  const { t } = useTranslation()
  const first = data?.list?.length ? (data.currentPage - 1) * (data.pageSize || CUSTOMER_CATALOG.PAGE_SIZE) + 1 : 0
  const last = first ? first + data.list.length - 1 : 0
  const filters = [
    query.keyword && { id: 'keyword', label: t('customer.keywordFilter', { keyword: query.keyword }) },
    query.city && { id: 'city', label: query.city },
    query.district && { id: 'district', label: query.district }
  ].filter(Boolean)
  return (
    <CatalogResultSummary
      icon={MapPinned}
      title={loading ? t('customer.findingLockers') : error ? t('customer.lockerList') : (
        <>
          <strong className="mr-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {data?.total || 0}
          </strong>
          {t('customer.lockersAvailable', { count: data?.total || 0 })}
        </>
      )}
      sortControl={sortControl}
      range={!loading && !error && first > 0 ? t('customer.showingOfLockers', { first, last, total: data.total }) : undefined}
      filters={filters}
      onRemoveFilter={onRemoveFilter}
      onClearFilters={onClearFilters}
    />
  )
}
