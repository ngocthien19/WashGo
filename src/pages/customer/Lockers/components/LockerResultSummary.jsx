import { useTranslation } from 'react-i18next'
import { ArrowDownAZ, Layers3, MapPinned, Navigation, Search } from 'lucide-react'

export default function LockerResultSummary({ data, loading, error, keyword, sort }) {
  const { t } = useTranslation()
  const SortIcon = sort === 'nearest' ? Navigation : ArrowDownAZ
  const first = data?.list?.length ? (data.currentPage - 1) * data.pageSize + 1 : 0
  const last = first ? first + data.list.length - 1 : 0
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
        <div
          className="flex items-center gap-3"
          role="status"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPinned
              size={21}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <div>
            <p className="font-medium text-muted-foreground">
              {loading ? t('customer.findingLockers') : error ? t('customer.lockerList') : (
                <>
                  <strong className="mr-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                    {data?.total || 0}
                  </strong>
                  {t('customer.lockersAvailable', { count: data?.total || 0 })}
                </>
              )}
            </p>
            {!loading && !error && first > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('customer.showingOfLockers', { first: first, last: last, total: data.total })}
              </p>
            )}
          </div>
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <SortIcon
                size={14}
                aria-hidden="true"
              />
              {sort === 'nearest' ? t('customer.nearest') : t('customer.nameAZ')}
            </span>
            {data?.totalPages > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 tabular-nums">
                <Layers3
                  size={14}
                  aria-hidden="true"
                />
                {t('customer.page', { currentPage: data.currentPage, totalPages: data.totalPages })}
              </span>
            )}
          </div>
        )}
      </div>
      {keyword && (
        <p className="flex items-start gap-2 border-t border-border/70 bg-muted/20 px-5 py-3 text-sm text-muted-foreground sm:px-6">
          <Search
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span className="break-words [overflow-wrap:anywhere]">
            {t('customer.resultsFor')}
            <strong className="font-semibold text-primary">
              {keyword}
            </strong>
            {t('customer.closingQuote')}
          </span>
        </p>
      )}
    </div>
  )
}
