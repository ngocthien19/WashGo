import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import FeedbackCard from './FeedbackCard'
import './feedback-carousel.css'

export default function FeedbackCarousel({ rows }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  const [selected, setSelected] = useState(0)
  const [height, setHeight] = useState(320)
  const active = selected % rows.length

  useLayoutEffect(() => {
    const card = ref.current?.querySelector('[data-active="true"]')
    if (!card) {
      return
    }
    const observer = new ResizeObserver(() => setHeight(card.offsetHeight + 48))
    observer.observe(card)
    return () => observer.disconnect()
  }, [active, rows])

  return (
    <div
      ref={ref}
      role="region"
      aria-label={t('customerReviews.carousel')}
    >
      <div className="relative">
        <ul
          className="feedback-carousel-track"
          aria-live="polite"
          style={{ height }}
        >
          {rows.map((row, index) => {
            let offset = (index - active + rows.length) % rows.length
            if (offset > rows.length / 2) {
              offset -= rows.length
            }
            return (
              <FeedbackCard
                key={row.id}
                row={row}
                preview
                className="feedback-carousel-card"
                style={{ '--review-offset': offset, zIndex: rows.length - Math.abs(offset) }}
                data-active={index === active}
                data-near={Math.abs(offset) <= 1}
                aria-hidden={index !== active}
                inert={index !== active}
              />
            )
          })}
        </ul>
        {rows.length > 1 && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-between sm:px-2">
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto size-10 rounded-full border-primary bg-card text-primary shadow-md hover:border-primary hover:bg-muted hover:text-primary sm:size-12 dark:border-primary dark:bg-card dark:hover:border-primary dark:hover:bg-[color-mix(in_srgb,white_7.5%,var(--card))] dark:hover:text-primary"
              aria-label={t('customerReviews.previous')}
              onClick={() => setSelected(index => (index - 1 + rows.length) % rows.length)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto size-10 rounded-full border-primary bg-card text-primary shadow-md hover:border-primary hover:bg-muted hover:text-primary sm:size-12 dark:border-primary dark:bg-card dark:hover:border-primary dark:hover:bg-[color-mix(in_srgb,white_7.5%,var(--card))] dark:hover:text-primary"
              aria-label={t('customerReviews.next')}
              onClick={() => setSelected(index => (index + 1) % rows.length)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
      {rows.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-0">
          {rows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              className="group flex h-9 min-w-7 cursor-pointer items-center justify-center rounded-full px-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t('customerReviews.showReview', { number: index + 1 })}
              aria-current={active === index ? 'true' : undefined}
              onClick={() => setSelected(index)}
            >
              <span className={`h-2.5 rounded-full transition-all motion-reduce:transition-none ${active === index ? 'w-7 bg-primary' : 'w-2.5 bg-primary/30 group-hover:bg-primary/65'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
