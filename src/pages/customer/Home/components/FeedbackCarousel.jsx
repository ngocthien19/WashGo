import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useInView } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import FeedbackCard from './FeedbackCard'
import './feedback-carousel.css'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches
const subscribeReducedMotion = listener => {
  const media = window.matchMedia(reducedMotionQuery)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export default function FeedbackCarousel({ rows }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  const visible = useInView(ref, { amount: 0.15 })
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true)
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
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

  useEffect(() => {
    if (rows.length < 2 || reducedMotion || !visible || paused || hovered || focused) {
      return
    }
    let timer
    const schedule = () => {
      clearInterval(timer)
      if (!document.hidden) {
        timer = setInterval(() => setSelected(index => (index + 1) % rows.length), 3500)
      }
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [rows.length, reducedMotion, visible, paused, hovered, focused, active])

  return (
    <div
      ref={ref}
      role="region"
      aria-label={t('customerReviews.carousel')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false)
        }
      }}
    >
      <div className="relative">
        <ul
          className="feedback-carousel-track"
          aria-live={paused || focused ? 'polite' : 'off'}
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
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between sm:px-2">
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto size-10 rounded-full bg-card shadow-md sm:size-12"
              aria-label={t('customerReviews.previous')}
              onClick={() => setSelected(index => (index - 1 + rows.length) % rows.length)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto size-10 rounded-full bg-card shadow-md sm:size-12"
              aria-label={t('customerReviews.next')}
              onClick={() => setSelected(index => (index + 1) % rows.length)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
      {rows.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1">
          {rows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              className="group flex size-11 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t('customerReviews.showReview', { number: index + 1 })}
              aria-current={active === index ? 'true' : undefined}
              onClick={() => setSelected(index)}
            >
              <span className={`h-2.5 rounded-full transition-all motion-reduce:transition-none ${active === index ? 'w-7 bg-primary' : 'w-2.5 bg-primary/30 group-hover:bg-primary/65'}`} />
            </button>
          ))}
          {!reducedMotion && (
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              aria-label={t(paused ? 'customerReviews.resume' : 'customerReviews.pause')}
              onClick={() => setPaused(value => !value)}
            >
              {paused ? <Play /> : <Pause />}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
