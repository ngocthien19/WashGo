import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FeaturedServices from './components/FeaturedServices'
import HowItWorks from './components/HowItWorks'
import NearbyLockers from './components/NearbyLockers'
import hero from '~/assets/customer/locker-hero.jpg'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { CUSTOMER_CATALOG, HERO_MOTION, UI_MOTION } from '~/utils/constants'

const loadFeaturedServices = (signal) => customerCatalogApi.getServices({
  page: CUSTOMER_CATALOG.INITIAL_PAGE,
  take: CUSTOMER_CATALOG.FEATURED_LIMIT
}, signal)

export default function HomePage() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
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
      <section className="overflow-hidden bg-gradient-to-br from-primary/8 via-primary/3 to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:gap-20 lg:px-8 lg:py-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -HERO_MOTION.OFFSET }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduceMotion ? 0 : HERO_MOTION.DURATION, ease: UI_MOTION.EASE }}
          >
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t('customer.smartLaundry')}
              <br />
              <span className="text-primary">
                {t('customer.everydayConvenience')}
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-muted-foreground">
              {t('customer.dropYourLaundryInALockerAndLetWashgo')}
            </p>
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
          </motion.div>
          <motion.img
            initial={reduceMotion ? false : { opacity: 0, x: HERO_MOTION.OFFSET }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduceMotion ? 0 : HERO_MOTION.DURATION, ease: UI_MOTION.EASE }}
            src={hero}
            alt={t('customer.aCustomerUsingAWashgoLaundryLocker')}
            className="mx-auto aspect-square w-full max-w-lg rounded-3xl object-cover shadow-sm"
            width={1024}
            height={1024}
            fetchPriority="high"
          />
        </div>
      </section>
      <FeaturedServices {...featured} />
      <NearbyLockers />
      <HowItWorks />
    </>
  )
}
