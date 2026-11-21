import { useTranslation } from 'react-i18next'
import { MessageSquareQuote, Star } from 'lucide-react'
import { formatDateTime } from '~/utils/format/formats'
import FeedbackImage from './FeedbackImage'
import ReviewComment from './ReviewComment'
import { cn } from '~/lib/utils'

export default function FeedbackCard({ row, preview = false, layout = 'card', className, ...props }) {
  const { t } = useTranslation()
  const isList = layout === 'list'
  return (
    <li
      {...props}
      className={cn('relative flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6', isList && 'rounded-2xl sm:p-5', className)}
    >
      <div className={cn('flex items-start gap-3', isList && 'flex-wrap')}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquareQuote
            className="size-5"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-base font-semibold">
            {t('customerReviews.anonymous')}
          </p>
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
            <span
              className="ml-1 text-sm font-medium text-muted-foreground"
              aria-hidden="true"
            >
              (
              {row.overallStars}
              /5)
            </span>
          </div>
        </div>
        {isList && (
          <time
            className="ml-auto pt-1 text-xs text-muted-foreground sm:text-sm"
            dateTime={row.publishedAt}
          >
            {formatDateTime(row.publishedAt)}
          </time>
        )}
      </div>
      {row.comment && (
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 dark:border-primary/25 dark:bg-primary/10">
          {preview ? (
            <ReviewComment>
              {row.comment}
            </ReviewComment>
          ) : (
            <p className="whitespace-pre-line break-words text-base leading-7 text-foreground">
              {row.comment}
            </p>
          )}
        </div>
      )}
      {!!row.imageUrls.length && (
        <div className={cn('flex shrink-0 gap-2 overflow-x-auto pb-1', isList && 'gap-3 [&_button]:size-20')}>
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
      {!isList && (
        <time
          className="block border-t border-border/70 pt-3 text-xs text-muted-foreground"
          dateTime={row.publishedAt}
        >
          {formatDateTime(row.publishedAt)}
        </time>
      )}
    </li>
  )
}
