import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import dropoff from '~/assets/customer/locker-community-hero.png'
import pickup from '~/assets/customer/hero-pickup.png'
import courier from '~/assets/customer/hero-courier.png'
import riding from '~/assets/customer/hero-riding.png'
import handoff from '~/assets/customer/hero-handoff.png'
import sorting from '~/assets/customer/hero-sorting.png'
import folding from '~/assets/customer/hero-folding.png'

const photos = [dropoff, pickup, courier, riding, handoff, sorting, folding]
const INTERVAL_MS = 4000

export default function HeroSlideshow() {
  const ref = useRef(null)
  const visible = useInView(ref, { amount: 0.1 })
  const reduceMotion = useReducedMotion()
  const [{ current, previous }, setSlide] = useState({ current: 0, previous: null })

  useEffect(() => {
    if (reduceMotion || !visible) {
      return
    }
    let cancelled = false, timer
    const next = (current + 1) % photos.length
    const image = new Image()
    image.src = photos[next]
    // Fetch only the next photo, and keep the current one until it is decoded.
    const ready = image.decode().then(() => true, () => false)
    const schedule = () => {
      clearTimeout(timer)
      if (document.hidden) {
        return
      }
      timer = setTimeout(async () => {
        if (await ready && !cancelled && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setSlide({ current: next, previous: current })
        }
      }, INTERVAL_MS)
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [current, reduceMotion, visible])

  const renderPhoto = (index, active = false) => (
    <>
      <div
        className="absolute -inset-4 bg-cover bg-center blur-md sm:hidden"
        style={{ backgroundImage: `url("${photos[index]}")` }}
      />
      <img
        src={photos[index]}
        alt=""
        className="absolute inset-x-0 top-[18%] h-auto w-full object-contain max-sm:mask-[linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] sm:inset-0 sm:size-full sm:object-cover sm:object-center"
        width={1672}
        height={941}
        fetchPriority={active && index === 0 ? 'high' : 'auto'}
        data-hero-active-photo={active ? index : undefined}
      />
    </>
  )
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 opacity-55 dark:opacity-35"
      data-hero-slideshow
    >
      {previous !== null && (
        <div className="absolute inset-0">
          {renderPhoto(previous)}
        </div>
      )}
      <motion.div
        key={current}
        className="absolute inset-0"
        initial={previous === null || reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.9, ease: 'easeInOut' }}
      >
        {renderPhoto(current, true)}
      </motion.div>
    </div>
  )
}
