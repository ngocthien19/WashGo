import { useState } from 'react'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useTranslation } from 'react-i18next'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import { incidentListFilter } from '../incidentModel'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import { SelectField } from '~/components/ui/select'

export default function IncidentFilters({ params, change }) {
  const { t } = useTranslation()
  const [resetVersion, setResetVersion] = useState(0)
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 font-semibold shadow-sm">
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,3fr)]">
        <CatalogToolbar
          suggestionType="incident"
          suggestionFilter={incidentListFilter(params)}
          resetKey={resetVersion}
          embedded
          keyword={params.get('keyword') || ''}
          onSearch={(keyword) => change({ keyword })}
          label={t('customer.sync.searchIncidents')}
          placeholder={t('customer.sync.searchIncidents')}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label={t('customer.incidents.statusLabel')}
            value={params.get('status') || ''}
            onValueChange={(status) => change({ status })}
            options={[{ value: '', label: t('common.all') }, ...[1, 2, 3, 4].map((value) => ({ value: String(value), label: t(value === 4 ? 'customer.sync.withdrawn' : `customer.incidents.status.${value}`) }))]}
          />
          <SelectField
            label={t('customer.incidents.type')}
            value={params.get('type') || ''}
            onValueChange={(type) => change({ type })}
            options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map((value) => ({ value: String(value), label: t(`customer.incidents.types.${value}`) }))]}
          />
          <SelectField
            label={t('customer.sync.sort')}
            value={params.get('sort') || 'newest'}
            onValueChange={(sort) => change({ sort })}
            options={['newest', 'oldest', 'status'].map((value) => ({ value, label: t(`customer.sync.sorts.${value}`) }))}
          />
        </div>
      </div>
      <ClearFiltersButton
        active={params.get('keyword') || params.get('status') || params.get('type') || params.get('from') || params.get('to') || (params.get('sort') && params.get('sort') !== 'newest')}
        onClear={() => {
          setResetVersion(value => value + 1); change({ keyword: '', status: '', type: '', sort: '', from: '', to: '' })
        }}
      />
      <DateRangeFilter
        key={`${resetVersion}-${params.get('from')}-${params.get('to')}`}
        from={params.get('from') || ''}
        to={params.get('to') || ''}
        onApply={change}
        label="customer.sync.incidentDates"
        className="grid gap-3"
      />
    </section>
  )
}
