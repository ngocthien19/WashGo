import { useTranslation } from 'react-i18next'
import { MapPinned } from 'lucide-react'
import CatalogResultSummary from '~/components/customer/catalog/CatalogResultSummary'

export default function LockerResultSummary({ data, loading, error, query, nearby = false, sortControl, radiusControl, onRemoveFilter, onClearFilters }) {
  const { t } = useTranslation()
  const filters = [
    query.keyword && { id: 'keyword', label: t('customer.keywordFilter', { keyword: query.keyword }) },
    query.city && { id: 'city', label: query.city }
  ].filter(Boolean)
  return (
    <CatalogResultSummary
      icon={MapPinned}
      count={!loading && !error ? nearby ? data?.list?.length || 0 : data?.total || 0 : undefined}
      title={loading ? t('customer.findingLockers') : error ? t('customer.lockerList') : t('customer.lockersAvailable', { count: nearby ? data?.list?.length || 0 : data?.total || 0 })}
      sortControl={sortControl}
      actions={radiusControl}
      filters={filters}
      onRemoveFilter={onRemoveFilter}
      onClearFilters={onClearFilters}
    />
  )
}
