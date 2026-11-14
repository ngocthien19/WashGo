import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'
import ServiceCatalog from './components/ServiceCatalog'

export default function ServicesPage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t('customer.allServicesWashgo')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [t])

  return (
    <div className="min-h-[70dvh] overflow-x-clip bg-muted/35">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Breadcrumb
          className="mb-8"
          items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.allServices') }]}
        />
        <ServiceCatalog />
      </div>
    </div>
  )
}
