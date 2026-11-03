import { Outlet } from 'react-router-dom'
import CustomerHeader from './components/CustomerHeader'
import CustomerFooter from './components/CustomerFooter'
import useCustomerLocation from '~/hooks/customer/useCustomerLocation'

export default function CustomerLayout() {
  const location = useCustomerLocation()
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground [--customer-header-offset:7rem]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Đến nội dung chính
      </a>
      <CustomerHeader />
      <main
        id="main-content"
        className="flex-1"
      >
        <Outlet context={location} />
      </main>
      <CustomerFooter />
    </div>
  )
}
