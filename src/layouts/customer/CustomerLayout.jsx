import { useTranslation } from 'react-i18next'
import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import CustomerHeader from './components/CustomerHeader'
import CustomerFooter from './components/CustomerFooter'
import useCustomerLocation from '~/hooks/useGeolocation'
import NotificationProvider from '~/components/notifications/NotificationProvider'
import ServiceTerms from '~/components/customer/terms/ServiceTerms'
import CustomerChatbot from '~/components/customer/chatbot/CustomerChatbot'
import { useSelector } from 'react-redux'
import CustomerPageGlow from '~/components/customer/SectionGlow/CustomerPageGlow'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'

export default function CustomerLayout() {
  const { t } = useTranslation()
  const location = useCustomerLocation()
  const { pathname } = useLocation()
  const userId = useSelector((state) => state.auth.user?.id)
  const signedIn = useSelector((state) => !!state.auth.accessToken)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  const content = (openTerms) => (
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
        className="relative isolate flex-1"
      >
        {pathname !== CUSTOMER_ROUTES.HOME && (
          <CustomerPageGlow
            reverse={[CUSTOMER_ROUTES.LOCKERS, CUSTOMER_ROUTES.ORDERS, CUSTOMER_ROUTES.PROFILE].some(route => pathname === route || pathname.startsWith(`${route}/`))}
          />
        )}
        <Outlet context={location} />
      </main>
      <CustomerFooter onOpenTerms={openTerms} />
      {signedIn && (
        <CustomerChatbot
          key={userId}
          onOpenTerms={openTerms}
        />
      )}
    </div>
  )
  if (!signedIn) {
    return (
      <ServiceTerms
        guest
        key="guest"
      >
        {content}
      </ServiceTerms>
    )
  }
  return (
    <NotificationProvider>
      <ServiceTerms key={userId}>
        {content}
      </ServiceTerms>
    </NotificationProvider>
  )
}
