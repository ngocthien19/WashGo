import { Link } from 'react-router-dom'
import { ArrowRight, Shirt } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import ServiceGrid from '~/components/customer/services/ServiceGrid'
import { CUSTOMER_ROUTES } from '~/utils/constants'

export default function FeaturedServices({ data, loading, error, retry }) {
  const services = data?.list || []

  return (
    <section
      id="services"
      aria-labelledby="featured-services-heading"
      className="mx-auto max-w-7xl scroll-mt-[var(--customer-header-offset)] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
    >
      <Reveal className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <SectionHeading
          id="featured-services-heading"
          title="Dịch vụ dành cho bạn"
          description="Chọn cách chăm sóc phù hợp cho từng món đồ. Giá thống nhất trên toàn hệ thống."
          icon={Shirt}
        />
        <Button
          render={<Link to={CUSTOMER_ROUTES.SERVICES} />}
          nativeButton={false}
          variant="outline-primary"
          className="h-11 w-fit shrink-0 gap-2 rounded-full px-5"
        >
          Xem tất cả
          <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
        </Button>
      </Reveal>
      <div aria-busy={loading}>
        {loading || error || !services.length ? (
          <CatalogFeedback
            loading={loading}
            error={error}
            retry={retry}
          />
        ) : (
          <ServiceGrid services={services} />
        )}
      </div>
    </section>
  )
}
