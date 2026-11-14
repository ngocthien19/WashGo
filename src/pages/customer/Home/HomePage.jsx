import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FeaturedServices from './components/FeaturedServices'
import HowItWorks from './components/HowItWorks'
import NearbyLockers from './components/NearbyLockers'
import CustomerFeedback from './components/CustomerFeedback'
import SectionGlow from './components/SectionGlow'
import hero from '~/assets/customer/locker-hero.jpg'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_CATALOG, HERO_MOTION, UI_MOTION } from '~/utils/config/constants'

const loadFeaturedServices = (signal) => customerCatalogApi.getServices({
  page: CUSTOMER_CATALOG.INITIAL_PAGE,
  take: 4
}, signal)

export default function HomePage() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 75])
  const { hash, key } = useLocation()
  const featured = useCatalogResource(loadFeaturedServices)
  useEffect(() => {
    document.title = t('customer.homeWashgo')
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [hash, key, t])
  useEffect(() => {
    if (!hash) {
      return
    }
    const anchor = () => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
    anchor()
    // Catalog and locker responses can both change the height above the anchor.
    const observer = new ResizeObserver(anchor)
    observer.observe(document.getElementById('main-content'))
    return () => observer.disconnect()
  }, [hash, key, featured.loading])

  return (
    <>
      <section
        ref={heroRef}
        aria-labelledby="home-hero-heading"
        className="relative isolate flex min-h-[max(34rem,calc(100svh-5rem))] items-center overflow-hidden bg-background"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-20 inset-x-0 -z-10"
          style={reduceMotion ? undefined : { y: backgroundY }}
          initial={reduceMotion ? false : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: UI_MOTION.EASE }}
        >
          <img
            src={hero}
            alt=""
            className="size-full object-cover object-[58%_58%] opacity-55 sm:object-[center_58%] dark:opacity-35"
            width={1024}
            height={1024}
            fetchPriority="high"
          />
        </motion.div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-background/95 via-background/65 to-background/20 dark:from-background/95 dark:via-background/70 dark:to-background/35"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-t from-background to-transparent"
        />
        <SectionGlow side="left" />
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: HERO_MOTION.OFFSET / 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : HERO_MOTION.DURATION, ease: UI_MOTION.EASE }}
            >
              <h1
                id="home-hero-heading"
                className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl"
              >
                {t('customer.smartLaundry')}
                <br />
                <span className="text-primary">
                  {t('customer.everydayConvenience')}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
                {t('customer.dropYourLaundryInALockerAndLetWashgo')}
              </p>
            </motion.div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                render={<a href="#services" />}
                nativeButton={false}
                className="h-12 rounded-xl px-6 text-base"
              >
                {t('customer.exploreServices')}
                <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
              </Button>
              <Button
                render={<a href="#how-it-works" />}
                nativeButton={false}
                variant="outline-primary"
                className="h-12 rounded-xl px-6 text-base"
              >
                {t('customer.learnMore')}
              </Button>
            </div>
          </div>
        </div>
      </section>
      <FeaturedServices {...featured} />
      <NearbyLockers />
      <HowItWorks />
      <CustomerFeedback />
    </>
  )
}
