import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { merchantReviewApi } from '~/apis/merchant/merchantReviewApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import { SelectField } from '~/components/ui/select'
import { dateRangeFilter } from '~/utils/dateRange'
import { formatDateTime } from '~/utils/formats'

export default function PartnerReviews() {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ keyword: '', stars: '', from: '', to: '', page: 1 }), [reset, setReset] = useState(0)
  const resource = useCatalogResource(useCallback(signal => merchantReviewApi.list({ ...dateRangeFilter(query), keyword: query.keyword || undefined, stars: query.stars ? Number(query.stars) : undefined, page: query.page, take: 5 }, signal), [query]))
  const update = patch => setQuery(current => ({ ...current, ...patch, page: 1 }))
  return (
    <section
      data-pagination-scope
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <h2 className="flex items-center gap-3 border-b border-primary/15 bg-primary/5 p-5 text-lg font-bold">
        <Star className="text-primary" />
        {t('merchant.reviewSync.title')}
      </h2>
      <div className="space-y-4 p-5">
        <div className="workspace-filters space-y-4 rounded-xl border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <CatalogToolbar
              embedded
              resetKey={reset}
              keyword={query.keyword}
              onSearch={keyword => update({ keyword: keyword.slice(0, 100) })}
              label={t('merchant.reviewSync.search')}
              placeholder={t('merchant.reviewSync.search')}
            />
            <SelectField
              value={query.stars}
              label={t('admin.reviews.stars')}
              onValueChange={stars => update({ stars })}
              options={[{ value: '', label: t('common.all') }, ...[5, 4, 3, 2, 1].map(value => ({ value: String(value), label: `${value} / 5` }))]}
            />
          </div>
          <DateRangeFilter
            key={`${reset}:${query.from}:${query.to}`}
            from={query.from}
            to={query.to}
            onApply={update}
            label="admin.reviews.dateRange"
          />
          <ClearFiltersButton
            active={query.keyword || query.stars || query.from || query.to}
            onClear={() => {
              setReset(value => value + 1); setQuery({ keyword: '', stars: '', from: '', to: '', page: 1 })
            }}
          />
        </div>
        {!resource.data || resource.error ? <ResourceFeedback {...resource} /> : (
          <>
            {!resource.data.list.length && (
              <p className="py-6 text-center text-muted-foreground">
                {t('admin.reviews.empty')}
              </p>
            )}
            <ul className="divide-y divide-border">
              {resource.data.list.map(row => (
                <li
                  key={row.id}
                  className="space-y-4 py-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                      <Star className="size-5 fill-current" />
                      {row.overallStars}
                      {' '}
                      / 5
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(row.createdOn)}
                    </span>
                  </div>
                  {row.contentReleased ? (
                    <>
                      <p className="whitespace-pre-wrap break-words text-base">
                        {row.comment || t('admin.reviews.noComment')}
                      </p>
                      <CustomerImageGallery urls={row.imageUrls} />
                      <CustomerVideoGallery urls={row.videoUrls} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('merchant.reviewSync.pendingContent')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {!!resource.data.total && (
              <TablePagination
                currentPage={query.page}
                totalPages={resource.data.totalPages}
                total={resource.data.total}
                pageSize={5}
                rowCount={resource.data.list.length}
                onPageChange={page => setQuery(current => ({ ...current, page }))}
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}
