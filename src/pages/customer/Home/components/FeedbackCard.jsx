import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { formatDateTime } from '~/utils/format/formats'
import FeedbackImage from './FeedbackImage'
import { cn } from '~/lib/utils'

export default function FeedbackCard({ row, preview = false }) {
  const { t } = useTranslation()
  return (
    <li className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
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
        <p className={cn('whitespace-pre-line break-words text-sm leading-7', preview && 'line-clamp-5')}>
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
  )
}
