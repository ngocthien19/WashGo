import { useState } from 'react'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import { readQuery } from '../financeModel'
import { useTranslation } from 'react-i18next'
import { ListFilter, CalendarDays, Search } from 'lucide-react'
import { SelectField } from '~/components/ui/select'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import DashboardFilters from '~/components/workspace/DashboardFilters'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'

export default function FinanceFilters({ query, merchants, onChange }) {
  const { t } = useTranslation()
  const [resetVersion, setResetVersion] = useState(0)
  const defaults = readQuery(new URLSearchParams({ tab: query.tab }))
  const active = ['keyword', 'merchantId', 'status', 'orderId', 'dateBasis', 'listFrom', 'listTo', 'period', 'from', 'to'].some(key => query[key] !== defaults[key])
  const period = ['revenue', 'commissions'].includes(query.tab)
  return (
    <section className="workspace-filters space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm [&_input]:text-sm [&_button]:text-sm [&_label]:text-sm">
      <h2 className="-mx-5 -mt-5 flex items-center gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 px-5 py-4 text-lg font-semibold">
        <ListFilter className="size-5 text-primary" />
        {t('customer.filters')}
      </h2>
      {!period && query.tab !== 'commissionReview' && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Search className="size-4 text-primary" />
            {t('admin.sync.searchFinance')}
          </p>
          <CatalogToolbar
            resetKey={resetVersion}
            embedded
            label={t('admin.sync.searchFinance')}
            placeholder={t('admin.sync.searchFinance')}
            keyword={query.keyword}
            onSearch={keyword => onChange({ keyword })}
            formClassName="min-h-12 bg-background"
          />
        </div>
      )}
      <div className={`grid items-stretch gap-4 ${period ? 'lg:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        <label className={`grid content-start gap-3 text-sm font-medium ${period ? 'rounded-xl border border-border bg-muted/15 p-4' : ''}`}>
          {t('admin.complaints.merchant')}
          <SelectField
            label={t('admin.complaints.merchant')}
            value={query.merchantId}
            disabled={merchants.loading || Boolean(merchants.error)}
            onValueChange={merchantId => onChange({ merchantId })}
            className="h-12 text-sm font-normal"
            options={[{ value: '', label: t('common.all') }, ...(merchants.data || []).map(row => ({ value: row.id, label: row.name })), ...(query.merchantId && !merchants.data?.some(row => row.id === query.merchantId) ? [{ value: query.merchantId, label: query.merchantId }] : [])]}
          />
        </label>
        {period ? (
          <div className="min-w-0 space-y-3 rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-primary" />
              {t('admin.finance.period')}
            </p>
            <DashboardFilters
              showClear={false}
              range={{ mode: query.period, from: query.from, to: query.to }}
              onChange={next => onChange({ period: next.mode, from: next.from || '', to: next.to || '' })}
            />
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {`${query.from.split('-').reverse().join('/')} – ${query.to.split('-').reverse().join('/')}`}
            </p>
          </div>
        ) : query.tab === 'commissionReview' ? null : (
          <>
            <label className="grid gap-3 text-sm font-medium">
              {t('admin.finance.status')}
              <SelectField
                label={t('admin.finance.status')}
                value={query.status}
                onValueChange={status => onChange({ status })}
                className="h-12 text-sm font-normal"
                options={[{ value: '', label: t('common.all') }, ...[1, 2, 3, 4].map(value => ({ value: String(value), label: t(`admin.finance.${query.tab === 'refunds' ? 'refundStatuses' : 'settlementStatuses'}.${value}`) }))]}
              />
            </label>
            <label className="grid gap-3 text-sm font-medium">
              {t('admin.sync.dateBasis')}
              <SelectField
                label={t('admin.sync.dateBasis')}
                value={query.dateBasis}
                onValueChange={dateBasis => onChange({ dateBasis })}
                className="h-12 text-sm font-normal"
                options={(query.tab === 'settlements' ? ['period', 'paid'] : ['created', 'reviewed', 'refunded']).map(value => ({ value, label: t(`admin.sync.dateBases.${value}`) }))}
              />
            </label>
          </>
        )}
      </div>
      {!period && query.tab !== 'commissionReview' && (
        <DateRangeFilter
          key={`${resetVersion}:${query.tab}:${query.listFrom}:${query.listTo}`}
          from={query.listFrom}
          to={query.listTo}
          onApply={range => onChange({ listFrom: range.from, listTo: range.to })}
          label="admin.finance.period"
          className="space-y-4 rounded-xl border border-primary/15 bg-primary/3 p-4 [&_p]:text-sm"
        />
      )}
      <ClearFiltersButton
        active={active}
        onClear={() => {
          setResetVersion(value => value + 1); onChange(defaults)
        }}
      />
      {merchants.error && <ResourceFeedback {...merchants} />}
    </section>
  )
}
