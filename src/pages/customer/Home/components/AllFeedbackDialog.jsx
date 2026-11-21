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
import { Button } from '~/components/ui/button'

export default function AllFeedbackDialog({ onClose }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, stars: '' })
  const [previousPage, setPreviousPage] = useState(null)
  const reviews = useCatalogResource(useCallback(async signal => {
    const data = await customerReviewApi.list({ page: query.page, take: CUSTOMER_REVIEWS.TAKE, ...(query.stars ? { stars: Number(query.stars) } : {}) }, signal)
    if (!signal.aborted) {
      setPreviousPage(data)
    }
    return data
  }, [query]))
  // Keep the list and pagination mounted while loading so the modal doesn't
  // collapse to the loading message and jump to the top before smooth scrolling.
  const displayed = reviews.data || (reviews.loading ? previousPage : null)
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
        className="max-w-4xl"
        data-dialog-fixed
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
        <div data-dialog-body>
          <div
            data-pagination-scope
            className="space-y-4"
          >
            <div
              className="flex scroll-mt-6 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3"
              data-pagination-header
            >
              <p className="text-base font-semibold text-primary sm:text-lg">
                {reviews.data ? t('customerReviews.found', { count: reviews.data.total }) : t('customerFeedbackActions.allTitle')}
              </p>
              <SelectField
                showLabel
                labelPosition="left"
                label={t('customerReviews.filter')}
                value={query.stars}
                onValueChange={stars => setQuery({ page: 1, stars: stars || '' })}
                className="w-40 sm:w-44"
                options={[{ value: '', label: t('customerReviews.allStars') }, ...[5, 4, 3, 2, 1].map(value => ({ value: String(value), label: t('customerReviews.stars', { count: value }) }))]}
              />
            </div>
            {!displayed || reviews.error || !displayed.list.length ? (
              <ResourceFeedback
                {...reviews}
                loadingText="customerReviews.loading"
                empty={query.stars ? 'customerReviews.noMatches' : 'catalogUi.feedbackEmpty'}
              />
            ) : (
              <>
                <ul
                  className="grid gap-4"
                  aria-busy={reviews.loading}
                >
                  {displayed.list.map(row => (
                    <FeedbackCard
                      key={row.id}
                      row={row}
                      layout="list"
                    />
                  ))}
                </ul>
                <TablePagination
                  currentPage={displayed.page}
                  totalPages={Math.ceil(displayed.total / CUSTOMER_REVIEWS.TAKE)}
                  total={displayed.total}
                  pageSize={CUSTOMER_REVIEWS.TAKE}
                  rowCount={displayed.list.length}
                  disabled={reviews.loading}
                  onPageChange={page => setQuery(current => ({ ...current, page }))}
                  className="px-0"
                />
              </>
            )}
          </div>
        </div>
        <footer
          data-dialog-footer
          className="flex justify-end"
        >
          <Button
            variant="secondary"
            className="h-11 px-6"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
