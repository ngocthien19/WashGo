import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { CUSTOMER_ROUTES, TEXT_LINK_STYLES } from '~/utils/constants'
import ServiceCatalog from './components/ServiceCatalog'

export default function ServicesPage() {
  useEffect(() => {
    document.title = 'Tất cả dịch vụ | WashGo'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <div className="min-h-[70dvh] bg-muted/35">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Đường dẫn trang"
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link
            to={CUSTOMER_ROUTES.HOME}
            className={`hover:text-primary ${TEXT_LINK_STYLES}`}
          >
            Trang chủ
          </Link>
          <ChevronRight
            size={14}
            aria-hidden="true"
          />
          <span
            aria-current="page"
            className="font-semibold text-foreground"
          >
            Tất cả dịch vụ
          </span>
        </nav>
        <ServiceCatalog />
      </div>
    </div>
  )
}
