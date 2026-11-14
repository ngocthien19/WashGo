import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Shirt } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ServiceGrid from '~/components/customer/services/ServiceGrid'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'
import SectionGlow from '~/components/customer/SectionGlow/SectionGlow'
import ScrollAccent from '~/components/motion/ScrollAccent'

export default function FeaturedServices({ data, loading, error, retry }) {
  const { t } = useTranslation()
  const services = data?.list || []

  return (
    <section
      id="services"
      aria-labelledby="featured-services-heading"
      className="relative isolate scroll-mt-[var(--customer-header-offset)] overflow-hidden"
    >
      <SectionGlow side="left" />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <ScrollAccent className="min-w-0">
            <SectionHeading
              id="featured-services-heading"
              title={t('customer.servicesForYou')}
              description={t('customer.chooseTheRightCareForEveryItemConsistentPrices')}
              descriptionClassName="text-base"
              icon={Shirt}
            />
          </ScrollAccent>
          <div className="w-fit shrink-0">
            <Button
              render={<Link to={CUSTOMER_ROUTES.SERVICES} />}
              nativeButton={false}
              className="h-11 w-fit shrink-0 gap-2 rounded-full px-5 text-base"
            >
              {t('customer.viewAll')}
              <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Button>
          </div>
        </div>
        <div aria-busy={loading}>
          {loading || error || !services.length ? (
            <CatalogFeedback
              loading={loading}
              error={error}
              retry={retry}
            />
          ) : (
            <ServiceGrid
              featured
              services={services}
              className="lg:grid-cols-4"
            />
          )}
        </div>
      </div>
    </section>
  )
}
