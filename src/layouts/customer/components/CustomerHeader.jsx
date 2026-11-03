import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { toast } from 'react-toastify'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import ThemeToggle from '~/components/ThemeToggle/ThemeToggle'
import { authApi } from '~/apis/auth/authApi'
import { clearSession } from '~/redux/auth/authSlice'
import { CUSTOMER_NAVIGATION, CUSTOMER_ROUTES, UI_TRANSITIONS, UI_MOTION } from '~/utils/constants'
import { getInitials } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { cn } from '~/lib/utils'
import Brand from '~/components/Brand/Brand'

export default function CustomerHeader() {
  const { user, refreshToken } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)

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
      toast.error(getApiError(error))
    } finally {
      setPending(false)
    }
  }

  const navigation = (mobile = false) => (
    <nav
      aria-label={mobile ? 'Điều hướng trên điện thoại' : 'Điều hướng chính'}
      className={cn('gap-1', mobile ? 'flex flex-col border-t border-border px-4 py-3' : 'hidden items-center lg:flex')}
    >
      {CUSTOMER_NAVIGATION.map((item) => item.pending ? (
        <span
          key={item.label}
          title="Sẽ triển khai trong tính năng tiếp theo"
          className="cursor-not-allowed rounded-lg px-3 py-2.5 text-sm text-muted-foreground/60"
          aria-disabled="true"
        >
          {item.label}
        </span>
      ) : (
        <Link
          key={item.label}
          to={item.href}
          onClick={() => {
            setMobileOpen(false)
            if (item.href === CUSTOMER_ROUTES.HOME) {
              window.scrollTo({ top: 0, behavior: 'instant' })
            }
          }}
          aria-current={pathname === item.href ? 'page' : undefined}
          className={cn('relative rounded-xl px-3 py-2.5 text-sm font-medium no-underline hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring', UI_TRANSITIONS.BUTTON, pathname === item.href && 'text-primary')}
        >
          {pathname === item.href && (
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
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Brand
          to={CUSTOMER_ROUTES.HOME}
          label="WashGo - Trang chủ"
          wordmarkClassName="hidden min-[360px]:inline"
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
            aria-label="Thông báo (chưa triển khai)"
            tooltip="Thông báo — sẽ có trong tính năng tiếp theo"
          >
            <Bell size={19} />
          </Button>
          <ThemeToggle inline />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(
                <Button
                  variant="ghost"
                  className="h-11 max-w-52 gap-2 rounded-full px-1.5 sm:pl-2"
                  aria-label="Mở menu tài khoản"
                  tooltip="Menu tài khoản"
                />
              )}
            >
              {user?.avatar && !avatarFailed ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="size-8 rounded-full object-cover"
                  onError={() => setAvatarFailed(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {getInitials(user?.fullName)}
                </span>
              )}
              <span className="hidden max-w-24 truncate text-sm lg:block xl:max-w-36">
                {user?.fullName || 'Tài khoản'}
              </span>
              <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="border-b border-border px-3 py-3">
                <p className="truncate text-sm font-semibold">
                  {user?.fullName || 'Khách hàng'}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuItem disabled>
                <UserRound size={16} />
                Hồ sơ cá nhân (sắp có)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending}
                onClick={logout}
                className="text-destructive"
              >
                <LogOut size={16} />
                {pending ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 lg:hidden"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileOpen}
            aria-controls="customer-mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Menu size={20} />
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <div id="customer-mobile-navigation">
          {navigation(true)}
        </div>
      )}
    </header>
  )
}
