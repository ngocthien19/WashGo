import { useEffect, useLayoutEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Store, UserRound, Menu, ChevronDown, LogOut, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import Brand from '~/components/Brand/Brand'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import LanguageSwitcher from '~/components/LanguageSwitcher/LanguageSwitcher'
import ThemeToggle from '~/components/ThemeToggle/ThemeToggle'
import NotificationProvider from '~/components/notifications/NotificationProvider'
import NotificationBell from '~/components/notifications/NotificationBell'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import NavTooltip from './NavTooltip'
import { authApi } from '~/apis/auth/authApi'
import { clearSession } from '~/redux/auth/authSlice'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'

export default function WorkspaceLayout({ navigation, homeHref, profileHref, notificationsHref, resolveNotificationHref, context, prefix = 'merchant', admin = false }) {
  const navHref = (key) => navigation.find((item) => item[0] === key)?.[2]
  const { t } = useTranslation()
  const { user, refreshToken } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [pending, setPending] = useState(false)
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
        aria-label={t(`${prefix}.navigation`)}
        className="space-y-1"
      >
        {navigation.map(([key, Icon, href, enabled = true]) => (
          <NavTooltip
            key={key}
            content={enabled ? t(`${prefix}.nav.${key}`) : `${t(`${prefix}.nav.${key}`)} · ${t('admin.comingSoon')}`}
            show={compact}
            disabled={!enabled}
          >
            <Link
              to={enabled ? href : undefined}
              role={!enabled ? 'link' : undefined}
              aria-disabled={!enabled || undefined}
              tabIndex={!enabled ? -1 : undefined}
              onClick={() => setMobileOpen(false)}
              aria-current={enabled && (key === 'overview' ? pathname === navHref(key) : pathname.startsWith(navHref(key))) ? 'page' : undefined}
              aria-label={t(`${prefix}.nav.${key}`)}

              className={`flex w-full items-center ${enabled ? 'hover:bg-primary/12 hover:text-primary focus-visible:bg-primary/12 focus-visible:text-primary' : 'pointer-events-none opacity-45'} ${compact ? 'justify-center px-0' : 'gap-3 px-4'} rounded-xl py-3 text-base font-semibold ${enabled && (key === 'overview' ? pathname === navHref(key) : pathname.startsWith(navHref(key))) ? 'bg-primary/12 text-primary' : 'text-muted-foreground'}`}
            >
              <Icon size={19} />
              {!compact && t(`${prefix}.nav.${key}`)}
            </Link>
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
      listHref={notificationsHref}
      resolveHref={resolveNotificationHref}
    >
      <div className="min-h-dvh bg-background text-foreground">
        <header className={`sticky top-0 z-40 border-b border-border ${admin || prefix === 'shipper' ? 'bg-card' : 'bg-card/95'} backdrop-blur-md ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t(`${prefix}.openNavigation`)}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <Menu size={20} />
              </Button>
              <Brand
                to={homeHref}
                wordmarkClassName="hidden sm:inline"
              />
            </div>
            <span className="hidden rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary sm:inline-flex">
              {t(`${prefix}.workspace`)}
            </span>
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
                  <DropdownMenuItem render={<Link to={profileHref} />}>
                    {prefix === 'merchant' ? <Store size={16} /> : <UserRound size={16} />}
                    {t(`${prefix}.nav.profile`)}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={notificationsHref} />}>
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
        <aside className={`group/sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border ${admin ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : 'bg-card'} lg:flex ${collapsed ? 'w-20' : 'w-64'}`}>
          <div className="flex h-20 shrink-0 items-center justify-center border-b border-border px-4">
            <NavTooltip
              content="WashGo"
              show={collapsed}
            >
              <Brand
                to={homeHref}
                label="WashGo"
                wordmarkClassName={collapsed ? 'hidden' : undefined}
              />
            </NavTooltip>
          </div>
          <div className="absolute -right-3 top-24 z-10 opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 focus-within:opacity-100">
            <NavTooltip
              content={t(collapsed ? `${prefix}.expandNavigation` : `${prefix}.collapseNavigation`)}
              show
            >
              <Button
                variant="outline"
                size="icon"
                className="size-6 rounded-full bg-card shadow-sm"
                aria-label={t(collapsed ? `${prefix}.expandNavigation` : `${prefix}.collapseNavigation`)}
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
          <Outlet context={{ ...context, logout, logoutPending: pending }} />
        </main>
      </div>
    </NotificationProvider>
  )
}
