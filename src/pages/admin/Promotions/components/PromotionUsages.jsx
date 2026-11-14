import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminPromotionApi } from '~/apis/admin/adminPromotionApi'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import { SelectField } from '~/components/ui/select'
import { dateRangeFilter } from '~/utils/format/dateRange'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'

export default function PromotionUsages({ id }) {
  const { t } = useTranslation(), [page, setPage] = useState(1), [reverted, setReverted] = useState(''), [range, setRange] = useState({ from: '', to: '' })
  const [resetVersion, setResetVersion] = useState(0)
  const load = useCallback(signal => adminPromotionApi.usages(id, { page, take: 10, ...dateRangeFilter(range), isReverted: reverted === '' ? undefined : reverted === 'true' }, signal), [id, page, range, reverted])
  const resource = useCatalogResource(load)
  return (
    <section
      data-pagination-scope
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="-mx-5 -mt-5 flex items-center gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 p-5 text-lg font-semibold">
        <History className="size-5 text-primary" />
        {t('admin.sync.promotionUsages')}
      </h2>
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        {t('admin.finance.status')}
        <SelectField
          label={t('admin.finance.status')}
          value={reverted}
          onValueChange={value => {
            setReverted(value); setPage(1)
          }}
          options={[{ value: '', label: t('common.all') }, { value: 'false', label: t('admin.sync.applied') }, { value: 'true', label: t('admin.sync.reverted') }]}
        />
      </label>
      <ClearFiltersButton
        active={reverted || range.from || range.to}
        onClear={() => {
          setResetVersion(value => value + 1); setReverted(''); setRange({ from: '', to: '' }); setPage(1)
        }}
      />
      <DateRangeFilter
        key={`${resetVersion}:${range.from}:${range.to}`}
        {...range}
        label="admin.sync.promotionUsageRange"
        onApply={value => {
          setRange(value); setPage(1)
        }}
      />
      {!resource.data ? <ResourceFeedback {...resource} /> : (
        <>
          {!resource.data.list.length && (
            <p className="text-muted-foreground">
              {t('admin.noData')}
            </p>
          )}
          <ul className="divide-y divide-border">
            {resource.data.list.map(row => (
              <li
                key={row.id}
                className="grid gap-3 py-4 sm:grid-cols-2"
              >
                <div>
                  <Link
                    to={`/admin/orders/${row.orderId}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {row.orderCode || t('customer.incidents.relatedOrder')}
                  </Link>
                  <p className="mt-1">
                    {row.customerName || '—'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(row.usedAt)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${row.isReverted ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                    {t(row.isReverted ? 'admin.sync.reverted' : 'admin.sync.applied')}
                  </span>
                  <p className="mt-2 font-semibold">
                    {formatCurrency(row.discountAmount)}
                  </p>
                  {row.isReverted && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(row.revertedAt)}
                      {row.revertReason ? ` · ${row.revertReason}` : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {resource.data.total > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={Math.ceil(resource.data.total / 10)}
              total={resource.data.total}
              rowCount={resource.data.list.length}
              pageSize={10}
              onPageChange={setPage}
              className="px-0 pb-1"
            />
          )}
        </>
      )}
    </section>
  )
}
