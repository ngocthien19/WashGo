import { useTranslation } from 'react-i18next'
import { useCallback, useState } from 'react'
import { MessageSquareQuote, Star } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { customerReviewApi } from '~/apis/customer/customerReviewApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import { SelectField } from '~/components/ui/select'
import { CUSTOMER_REVIEWS } from '~/utils/config/constants'
import { formatDateTime, formatNumber } from '~/utils/format/formats'
import FeedbackImage from './FeedbackImage'

export default function CustomerFeedback() {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, stars: '' })
  const reviews = useCatalogResource(useCallback(signal => customerReviewApi.list({ page: query.page, take: CUSTOMER_REVIEWS.TAKE, ...(query.stars ? { stars: Number(query.stars) } : {}) }, signal), [query]))
  const summary = useCatalogResource(customerReviewApi.summary)
  return (
    <section
      data-pagination-scope
      aria-labelledby="customer-feedback-heading"
      className="border-y border-primary/10 bg-primary/3"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          id="customer-feedback-heading"
          icon={MessageSquareQuote}
          title={t('catalogUi.feedbackTitle')}
          description={t('catalogUi.feedbackDescription')}
        />
        <div className="mt-8 space-y-6">
          {summary.loading || summary.error || !summary.data ? (
            <ResourceFeedback
              {...summary}
              loadingText="customerReviews.loading"
            />
          ) : (
            <div className="grid gap-6 rounded-3xl border border-primary/15 bg-card p-6 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-4xl font-bold text-primary">
                  {summary.data.averageStars === null ? '—' : formatNumber(summary.data.averageStars)}
                  <span className="text-lg text-muted-foreground"> / 5</span>
                </p>
                <p className="font-medium">
                  {t('customerReviews.total', { count: summary.data.total })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('customerReviews.publishedOnly')}
                </p>
              </div>
              <ul
                className="space-y-2"
                aria-label={t('customerReviews.distribution')}
              >
                {[...summary.data.distribution].sort((a, b) => b.stars - a.stars).map(row => (
                  <li
                    key={row.stars}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex w-9 shrink-0 items-center gap-1">
                      {row.stars}
                      <Star className="size-3.5 fill-amber-400 text-amber-500" />
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-amber-400"
                        style={{ width: `${row.rate}%` }}
                      />
                    </span>
                    <span className="min-w-9 text-right tabular-nums">
                      {formatNumber(row.count)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div
            className="flex flex-wrap items-center justify-between gap-4"
            data-pagination-header
          >
            <p className="font-semibold">
              {reviews.data ? t('customerReviews.found', { count: reviews.data.total }) : t('catalogUi.feedbackTitle')}
            </p>
            <SelectField
              label={t('customerReviews.filter')}
              value={query.stars}
              onValueChange={stars => setQuery({ page: 1, stars: stars || '' })}
              className="w-48"
              options={[{ value: '', label: t('customerReviews.allStars') }, ...[5, 4, 3, 2, 1].map(value => ({ value: String(value), label: t('customerReviews.stars', { count: value }) }))]}
            />
          </div>
          {reviews.loading || reviews.error || !reviews.data?.list.length ? (
            <ResourceFeedback
              {...reviews}
              loadingText="customerReviews.loading"
              empty={query.stars ? 'customerReviews.noMatches' : 'catalogUi.feedbackEmpty'}
            />
          ) : (
            <>
              <ul className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {reviews.data.list.map(row => (
                  <li
                    key={row.id}
                    className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div
                      className="flex items-center gap-1"
                      aria-label={t('customerReviews.stars', { count: row.overallStars })}
                    >
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          aria-hidden="true"
                          className={`size-4 ${star <= row.overallStars ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                    <p className="font-semibold">
                      {t('customerReviews.anonymous')}
                    </p>
                    {row.comment && (
                      <p className="whitespace-pre-line break-words text-sm leading-7">
                        {row.comment}
                      </p>
                    )}
                    {!!row.imageUrls.length && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {row.imageUrls.map((path, index) => (
                          <FeedbackImage
                            key={path}
                            reviewId={row.id}
                            path={path}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                    <time
                      className="block text-xs text-muted-foreground"
                      dateTime={row.publishedAt}
                    >
                      {formatDateTime(row.publishedAt)}
                    </time>
                  </li>
                ))}
              </ul>
              <TablePagination
                currentPage={query.page}
                totalPages={Math.ceil(reviews.data.total / CUSTOMER_REVIEWS.TAKE)}
                total={reviews.data.total}
                pageSize={CUSTOMER_REVIEWS.TAKE}
                rowCount={reviews.data.list.length}
                onPageChange={page => setQuery(current => ({ ...current, page }))}
                className="px-0"
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
