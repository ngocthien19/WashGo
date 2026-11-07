import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Package, Truck, PanelsTopLeft, Shirt, ChartNoAxesCombined, Store, Menu, ChevronDown, LogOut, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import Brand from '~/components/Brand/Brand'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import LanguageSwitcher from '~/components/LanguageSwitcher/LanguageSwitcher'
import ThemeToggle from '~/components/ThemeToggle/ThemeToggle'
import NotificationProvider from '~/components/notifications/NotificationProvider'
import NotificationBell from '~/components/notifications/NotificationBell'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import NavTooltip from './NavTooltip'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantDashboardApi } from '~/apis/merchant/merchantDashboardApi'
import { authApi } from '~/apis/auth/authApi'
import { clearSession } from '~/redux/auth/authSlice'
import { MERCHANT_ROUTES } from '~/utils/constants'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'

const navigation = [['overview', LayoutDashboard], ['orders', Package], ['shippers', Truck], ['lockers', PanelsTopLeft], ['services', Shirt], ['reports', ChartNoAxesCombined]]
const resolveMerchantNotification = (item) => item.linkType === 'order' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.linkId || '') ? `${MERCHANT_ROUTES.HOME}?order=${item.linkId}` : null

export default function MerchantLayout() {
  const { t } = useTranslation()
  const { user, refreshToken } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [pending, setPending] = useState(false)
  const load = useCallback((signal) => merchantDashboardApi.profile(signal), [])
  const profile = useCatalogResource(load)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const changed = () => {
      if (desktop.matches) {
        setMobileOpen(false)
      }
    }
    desktop.addEventListener('change', changed)
    return () => desktop.removeEventListener('change', changed)
  }, [])
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  const logout = async () => {
    if (pending) {
      return
    }
    setPending(true)
    try {
      await authApi.logout(refreshToken); window.google?.accounts?.id?.disableAutoSelect?.(); dispatch(clearSession())
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setPending(false)
    }
  }
  const nav = (mobile = false) => {
    const compact = collapsed && !mobile
    return (
      <nav
        aria-label={t('merchant.navigation')}
        className="space-y-1"
      >
        {navigation.map(([key, Icon]) => ['overview', 'orders'].includes(key) ? (
          <NavTooltip
            key={key}
            content={t(`merchant.nav.${key}`)}
            show={compact}
          >
            <Link
              to={key === 'orders' ? MERCHANT_ROUTES.ORDERS : MERCHANT_ROUTES.HOME}
              onClick={() => setMobileOpen(false)}
              aria-current={(key === 'orders' ? pathname.startsWith(MERCHANT_ROUTES.ORDERS) : pathname === MERCHANT_ROUTES.HOME) ? 'page' : undefined}
              aria-label={t(`merchant.nav.${key}`)}

              className={`flex w-full items-center hover:bg-primary/12 hover:text-primary focus-visible:bg-primary/12 focus-visible:text-primary ${compact ? 'justify-center px-0' : 'gap-3 px-4'} rounded-xl py-3 text-base font-semibold ${(key === 'orders' ? pathname.startsWith(MERCHANT_ROUTES.ORDERS) : pathname === MERCHANT_ROUTES.HOME) ? 'bg-primary/12 text-primary' : 'text-muted-foreground'}`}
            >
              <Icon size={19} />
              {!compact && t(`merchant.nav.${key}`)}
            </Link>
          </NavTooltip>
        ) : (
          <NavTooltip
            key={key}
            content={`${t(`merchant.nav.${key}`)} — ${t('merchant.comingSoon')}`}
            show={compact}
            hoverClassName="group/nav-item cursor-not-allowed rounded-xl hover:bg-primary/12 focus-within:bg-primary/12"
            disabled
          >
            <Button
              variant="ghost"
              disabled
              aria-label={t(`merchant.nav.${key}`)}
              className={`h-12 w-full rounded-xl text-base font-normal text-muted-foreground disabled:opacity-100 group-hover/nav-item:text-primary group-focus-within/nav-item:text-primary ${compact ? 'justify-center px-0' : 'justify-start gap-3 px-4'}`}
              title={t('merchant.comingSoon')}
            >
              <Icon size={19} />
              {!compact && t(`merchant.nav.${key}`)}
            </Button>
          </NavTooltip>
        ))}
      </nav>
    )
  }
  const logoutButton = (compact = false) => (
    <NavTooltip
      content={t('common.signOut')}
      show={compact}
    >
      <Button
        variant="ghost"
        disabled={pending}
        onClick={logout}
        aria-label={t(pending ? 'common.signingOut' : 'common.signOut')}

        className={`h-12 w-full rounded-xl text-base text-destructive hover:bg-destructive/10 hover:text-destructive ${compact ? 'justify-center px-0' : 'justify-start gap-3 px-4'}`}
      >
        <LogOut size={19} />
        {!compact && t(pending ? 'common.signingOut' : 'common.signOut')}
      </Button>
    </NavTooltip>
  )
  return (
    <NotificationProvider
      listHref={MERCHANT_ROUTES.NOTIFICATIONS}
      resolveHref={resolveMerchantNotification}
    >
      <div className="min-h-dvh bg-background text-foreground">
        <header className={`sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t('merchant.openNavigation')}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <Menu size={20} />
              </Button>
              <Brand
                to={MERCHANT_ROUTES.HOME}
                wordmarkClassName="hidden sm:inline"
              />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <NotificationBell />
              <LanguageSwitcher />
              <ThemeToggle inline />
              <DropdownMenu>
                <DropdownMenuTrigger render={(
                  <Button
                    variant="ghost"
                    className="h-11 gap-2 rounded-full px-1.5"
                    aria-label={t('customer.openAccountMenu')}
                  />
                )}
                >
                  <UserAvatar
                    avatar={user?.avatar}
                    fullName={user?.fullName}
                  />
                  <span className="hidden max-w-40 truncate text-base font-semibold sm:inline">
                    {user?.fullName || t('common.account')}
                  </span>
                  <ChevronDown size={14} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="border-b border-border px-3 py-3">
                    <p className="truncate font-semibold">
                      {user?.fullName}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuItem render={<Link to={MERCHANT_ROUTES.PROFILE} />}>
                    <Store size={16} />
                    {t('merchant.nav.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={MERCHANT_ROUTES.NOTIFICATIONS} />}>
                    <Bell size={16} />
                    {t('customer.profile.allNotifications')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={logout}
                    className="text-destructive"
                  >
                    <LogOut size={16} />
                    {t(pending ? 'common.signingOut' : 'common.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {mobileOpen && (
            <div className="max-h-[70dvh] overflow-y-auto border-t border-border p-4 lg:hidden">
              {nav(true)}
              <div className="mt-4 border-t border-border pt-3">
                {logoutButton()}
              </div>
            </div>
          )}
        </header>
        <aside className={`group/sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card lg:flex ${collapsed ? 'w-20' : 'w-64'}`}>
          <div className="flex h-20 shrink-0 items-center justify-center border-b border-border px-4">
            <NavTooltip
              content="WashGo"
              show={collapsed}
            >
              <Brand
                to={MERCHANT_ROUTES.HOME}
                label="WashGo"
                wordmarkClassName={collapsed ? 'hidden' : undefined}
              />
            </NavTooltip>
          </div>
          <div className="absolute -right-3 top-24 z-10 opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 focus-within:opacity-100">
            <NavTooltip
              content={t(collapsed ? 'merchant.expandNavigation' : 'merchant.collapseNavigation')}
              show
            >
              <Button
                variant="outline"
                size="icon"
                className="size-6 rounded-full bg-card shadow-sm"
                aria-label={t(collapsed ? 'merchant.expandNavigation' : 'merchant.collapseNavigation')}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              </Button>
            </NavTooltip>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
            {nav()}
          </div>
          <div className="shrink-0 border-t border-border p-3">
            {logoutButton(collapsed)}
          </div>
        </aside>
        <main className={`min-w-0 p-4 sm:p-6 lg:p-8 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <Outlet context={{ profile }} />
        </main>
      </div>
    </NotificationProvider>
  )
}
