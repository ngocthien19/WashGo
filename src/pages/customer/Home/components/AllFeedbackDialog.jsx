import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquareQuote } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { SelectField } from '~/components/ui/select'
import TablePagination from '~/components/Pagination/TablePagination'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerReviewApi } from '~/apis/customer/customerReviewApi'
import { CUSTOMER_REVIEWS } from '~/utils/config/constants'
import FeedbackCard from './FeedbackCard'

export default function AllFeedbackDialog({ onClose }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, stars: '' })
  const reviews = useCatalogResource(useCallback(signal => customerReviewApi.list({ page: query.page, take: CUSTOMER_REVIEWS.TAKE, ...(query.stars ? { stars: Number(query.stars) } : {}) }, signal), [query]))
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="max-w-5xl"
      >
        <DialogHeader className="mb-6 pr-12">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
            <MessageSquareQuote />
            {t('customerFeedbackActions.allTitle')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {t('customerReviews.publishedOnly')}
          </DialogDescription>
        </DialogHeader>
        <div
          data-pagination-scope
          className="space-y-6"
        >
          <div
            className="flex flex-wrap items-center justify-between gap-4"
            data-pagination-header
          >
            <p className="font-semibold">
              {reviews.data ? t('customerReviews.found', { count: reviews.data.total }) : t('customerFeedbackActions.allTitle')}
            </p>
            <SelectField
              label={t('customerReviews.filter')}
              value={query.stars}
              onValueChange={stars => setQuery({ page: 1, stars: stars || '' })}
              className="w-full sm:w-48"
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
              <ul className="grid items-start gap-5 sm:grid-cols-2">
                {reviews.data.list.map(row => (
                  <FeedbackCard
                    key={row.id}
                    row={row}
                  />
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
      </DialogContent>
    </Dialog>
  )
}
