import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ArrowRight, MessageSquareQuote, Star } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { customerReviewApi } from '~/apis/customer/customerReviewApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import { CUSTOMER_REVIEWS } from '~/utils/config/constants'
import { formatNumber } from '~/utils/format/formats'
import ScrollAccent from '~/components/motion/ScrollAccent'
import FeedbackCard from './FeedbackCard'
import AllFeedbackDialog from './AllFeedbackDialog'
import SectionGlow from '~/components/customer/SectionGlow/SectionGlow'

const loadPreview = signal => customerReviewApi.list({ take: CUSTOMER_REVIEWS.TAKE }, signal)

export default function CustomerFeedback() {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const reviews = useCatalogResource(loadPreview)
  const summary = useCatalogResource(customerReviewApi.summary)
  return (
    <section
      aria-labelledby="customer-feedback-heading"
      className="relative isolate overflow-hidden border-y border-primary/10 bg-white dark:bg-background"
    >
      <SectionGlow side="right" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <ScrollAccent className="min-w-0">
            <SectionHeading
              id="customer-feedback-heading"
              icon={MessageSquareQuote}
              title={t('catalogUi.feedbackTitle')}
              description={t('catalogUi.feedbackDescription')}
              descriptionClassName="text-base"
            />
          </ScrollAccent>
          <div className="w-fit shrink-0">
            <Button
              onClick={() => setShowAll(true)}
              className="h-11 gap-2 rounded-full px-5 text-base"
              aria-haspopup="dialog"
            >
              {t('customerFeedbackActions.viewAll')}
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
        <div className="mt-8 space-y-6">
          {summary.loading || summary.error || !summary.data ? (
            <ResourceFeedback
              {...summary}
              loadingText="customerReviews.loading"
            />
          ) : (
            <ScrollAccent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-2">
                <Star
                  className="size-4 fill-amber-400 text-amber-500"
                  aria-hidden="true"
                />
                <span className="text-lg font-bold text-foreground">
                  {summary.data.averageStars === null ? '—' : formatNumber(summary.data.averageStars)}
                  <span className="text-sm font-normal text-muted-foreground"> / 5</span>
                </span>
              </span>
              <span>
                {t('customerReviews.total', { count: summary.data.total })}
              </span>
            </ScrollAccent>
          )}
          {reviews.loading || reviews.error || !reviews.data?.list.length ? (
            <ResourceFeedback
              {...reviews}
              loadingText="customerReviews.loading"
              empty="catalogUi.feedbackEmpty"
            />
          ) : (
            <ScrollAccent>
              <ul className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {reviews.data.list.map(row => (
                  <FeedbackCard
                    key={row.id}
                    row={row}
                    preview
                  />
                ))}
              </ul>
            </ScrollAccent>
          )}
        </div>
      </div>
      {showAll && <AllFeedbackDialog onClose={() => setShowAll(false)} />}
    </section>
  )
}
