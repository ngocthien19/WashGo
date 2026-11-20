import { useTranslation } from 'react-i18next'
import { MessageSquareQuote, Star } from 'lucide-react'
import { formatDateTime } from '~/utils/format/formats'
import FeedbackImage from './FeedbackImage'
import { cn } from '~/lib/utils'

export default function FeedbackCard({ row, preview = false, className, ...props }) {
  const { t } = useTranslation()
  return (
    <li
      {...props}
      className={cn('relative flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6', className)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquareQuote
            className="size-5"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold">
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
          </div>
        </div>
      </div>
      {row.comment && (
        <p className={cn('whitespace-pre-line break-words text-base leading-7 text-foreground/90', preview && 'line-clamp-5')}>
          {row.comment}
        </p>
      )}
      {!!row.imageUrls.length && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
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
        className="block border-t border-border/70 pt-3 text-xs text-muted-foreground"
        dateTime={row.publishedAt}
      >
        {formatDateTime(row.publishedAt)}
      </time>
    </li>
  )
}
