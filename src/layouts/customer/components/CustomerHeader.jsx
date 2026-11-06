import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, ClipboardList, LogOut, Menu, MessageSquareWarning, UserRound } from 'lucide-react'
import { notify } from '~/utils/notifications'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import ThemeToggle from '~/components/ThemeToggle/ThemeToggle'
import LanguageSwitcher from '~/components/LanguageSwitcher/LanguageSwitcher'
import { authApi } from '~/apis/auth/authApi'
import { clearSession } from '~/redux/auth/authSlice'
import { CUSTOMER_NAVIGATION, CUSTOMER_ROUTES, UI_TRANSITIONS, UI_MOTION } from '~/utils/constants'
import { getApiError } from '~/utils/apiError'
import { cn } from '~/lib/utils'
import Brand from '~/components/Brand/Brand'
import CustomerAvatar from '~/components/customer/CustomerAvatar/CustomerAvatar'

export default function CustomerHeader() {
  const { t } = useTranslation()
  const { user, refreshToken } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const isActive = (href) => pathname === href || (href === CUSTOMER_ROUTES.ORDERS
    && pathname.startsWith(`${CUSTOMER_ROUTES.ORDERS}/`) && pathname !== CUSTOMER_ROUTES.CREATE_ORDER)

  const logout = async () => {
    if (pending) {
      return
    }
    setPending(true)
    try {
      await authApi.logout(refreshToken)
      window.google?.accounts?.id?.disableAutoSelect?.()
      dispatch(clearSession())
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setPending(false)
    }
  }

  const navigation = (mobile = false) => (
    <nav
      aria-label={mobile ? t('customer.mobileNavigation') : t('customer.mainNavigation')}
      className={cn('gap-1', mobile ? 'flex flex-col border-t border-border px-4 py-3' : 'hidden items-center lg:flex')}
    >
      {CUSTOMER_NAVIGATION.map((item) => item.pending ? (
        <span
          key={t(item.label)}
          title={t('customer.comingInAFutureUpdate')}
          className="cursor-not-allowed rounded-lg px-3 py-2.5 text-sm text-muted-foreground/60"
          aria-disabled="true"
        >
          {t(item.label)}
        </span>
      ) : (
        <Link
          key={t(item.label)}
          to={item.href}
          onClick={() => {
            setMobileOpen(false)
            if (item.href === CUSTOMER_ROUTES.HOME) {
              window.scrollTo({ top: 0, behavior: 'instant' })
            }
          }}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={cn('relative whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium no-underline hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring lg:px-2 xl:px-3', UI_TRANSITIONS.BUTTON, isActive(item.href) && 'text-primary')}
        >
          {isActive(item.href) && (
            <motion.span
              layoutId={`customer-active-nav-${mobile ? 'mobile' : 'desktop'}`}
              transition={{ duration: reduceMotion ? 0 : UI_MOTION.DURATION, ease: UI_MOTION.EASE }}
              className="absolute inset-0 rounded-xl bg-primary/12 ring-1 ring-inset ring-primary/15"
              aria-hidden="true"
            >
              <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" />
            </motion.span>
          )}
          <span className="relative">
            {t(item.label)}
          </span>
        </Link>
      ))}
    </nav>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Brand
          to={CUSTOMER_ROUTES.HOME}
          label={t('customer.washgoHome')}
          wordmarkClassName="hidden min-[400px]:inline"
          onClick={() => {
            setMobileOpen(false)
            window.scrollTo({ top: 0, behavior: 'instant' })
          }}
        />
        {navigation()}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-full"
            disabled
            aria-label={t('customer.notificationsComingSoon')}
            tooltip={t('customer.notificationsWillBeAvailableInAFutureUpdate')}
          >
            <Bell size={19} />
          </Button>
          <LanguageSwitcher />
          <ThemeToggle inline />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(
                <Button
                  variant="ghost"
                  className="h-11 max-w-52 gap-2 rounded-full px-1.5 sm:pl-2"
                  aria-label={t('customer.openAccountMenu')}
                  tooltip={t('customer.accountMenu')}
                />
              )}
            >
              <CustomerAvatar
                avatar={user?.avatar}
                fullName={user?.fullName}
              />
              <span className="hidden max-w-24 truncate text-base xl:block xl:max-w-36">
                {user?.fullName || t('common.account')}
              </span>
              <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="border-b border-border px-3 py-3">
                <p className="truncate text-sm font-semibold">
                  {user?.fullName || t('customer.customer')}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuItem
                render={<Link to={CUSTOMER_ROUTES.PROFILE} />}
                aria-current={pathname === CUSTOMER_ROUTES.PROFILE ? 'true' : undefined}
              >
                <UserRound size={16} />
                {t('customer.profile.title')}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to={CUSTOMER_ROUTES.ORDERS} />}>
                <ClipboardList size={16} />
                {t('common.myOrders')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => notify.info('customer.thisContentIsBeingUpdated')}>
                <MessageSquareWarning size={16} />
                {t('customer.profile.manageComplaints')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => notify.info('customer.thisContentIsBeingUpdated')}>
                <Bell size={16} />
                {t('customer.profile.allNotifications')}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending}
                onClick={logout}
                className="text-destructive"
              >
                <LogOut size={16} />
                {pending ? t('common.signingOut') : t('common.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 lg:hidden"
            aria-label={t('customer.openNavigationMenu')}
            aria-expanded={mobileOpen}
            aria-controls="customer-mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Menu size={20} />
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <div
          id="customer-mobile-navigation"
          className="lg:hidden"
        >
          {navigation(true)}
        </div>
      )}
    </header>
  )
}
