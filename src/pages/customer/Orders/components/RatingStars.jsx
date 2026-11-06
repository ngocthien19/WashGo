import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { RATING_CONFIG } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function RatingStars({ label, value = 0, onChange, disabled = false, featured = false }) {
  const { t } = useTranslation()
  return (
    <div className={cn('space-y-2', featured && 'rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50 via-amber-50/50 to-background p-5 text-center dark:border-amber-400/20 dark:from-amber-400/10 dark:via-amber-400/5 dark:to-card')}>
      <p className={cn('text-sm font-medium', featured && 'font-semibold')}>
        {label}
      </p>
      <div
        role="group"
        aria-label={label}
        className={cn('flex flex-wrap items-center gap-1', featured && 'justify-center gap-1.5')}
      >
        {Array.from({ length: RATING_CONFIG.MAX_STARS }, (_, index) => index + 1).map((stars) => onChange ? (
          <Button
            key={stars}
            type="button"
            size="icon"
            variant="ghost"
            className={cn('size-10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-400/10', featured && 'size-9 sm:size-12')}
            aria-label={t('customer.rating.chooseStars', { label, count: stars })}
            aria-pressed={value === stars}
            disabled={disabled}
            onClick={() => onChange(stars)}
          >
            <Star className={cn('size-6 text-slate-300 dark:text-slate-500', featured && 'size-8', stars <= value && 'fill-amber-400 text-amber-500 dark:text-amber-400')} />
          </Button>
        ) : (
          <Star
            key={stars}
            aria-hidden="true"
            className={cn('size-5 text-muted-foreground/40', featured && 'size-8', stars <= value && 'fill-amber-400 text-amber-500')}
          />
        ))}
        <span className={cn('ml-2 rounded-lg bg-muted/70 px-2 py-1 text-sm font-bold tabular-nums text-foreground', featured && 'ml-0 basis-full bg-transparent text-lg text-amber-800 dark:text-amber-200')}>
          {value}
          /
          {RATING_CONFIG.MAX_STARS}
        </span>
      </div>
    </div>
  )
}
