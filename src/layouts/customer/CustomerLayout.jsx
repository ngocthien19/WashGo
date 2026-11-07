import { useTranslation } from 'react-i18next'
import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import CustomerHeader from './components/CustomerHeader'
import CustomerFooter from './components/CustomerFooter'
import useCustomerLocation from '~/hooks/useGeolocation'
import NotificationProvider from '~/components/notifications/NotificationProvider'
import ServiceTerms from '~/components/customer/terms/ServiceTerms'
import { useSelector } from 'react-redux'

export default function CustomerLayout() {
  const { t } = useTranslation()
  const location = useCustomerLocation()
  const { pathname } = useLocation()
  const userId = useSelector((state) => state.auth.user?.id)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return (
    <NotificationProvider>
      <ServiceTerms
        key={userId}
        userId={userId}
      >
        {(openTerms) => (
          <div className="flex min-h-dvh flex-col bg-background text-foreground [--customer-header-offset:7rem] print:min-h-0 print:bg-white print:text-black">
            <a
              href="#main-content"
              className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
              {t('customer.skipToMainContent')}
            </a>
            <CustomerHeader />
            <main
              id="main-content"
              className="flex-1"
            >
              <Outlet context={location} />
            </main>
            <CustomerFooter onOpenTerms={openTerms} />
          </div>
        )}
      </ServiceTerms>
    </NotificationProvider>
  )
}
