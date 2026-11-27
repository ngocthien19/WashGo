import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import AuthStory from './components/AuthStory'
import { AUTH_ROUTES } from '~/utils/config/constants'
import { cn } from '~/lib/utils'
import AuthBrand from '~/pages/auth/components/AuthBrand'
import DisplayControls from '~/components/DisplayControls/DisplayControls'

const pageTitles = {
  [AUTH_ROUTES.LOGIN]: 'auth.signIn',
  [AUTH_ROUTES.REGISTER]: 'auth.register',
  [AUTH_ROUTES.FORGOT_PASSWORD]: 'auth.forgotPassword',
  [AUTH_ROUTES.VERIFY_OTP]: 'auth.verificationCode',
  [AUTH_ROUTES.RESET_PASSWORD]: 'auth.resetPassword',
  [AUTH_ROUTES.ACCOUNT]: 'common.account'
}

export default function AuthLayout() {
  const { t } = useTranslation()
  const [flow, setFlow] = useState(null)
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const isSplitLayout = [AUTH_ROUTES.LOGIN, AUTH_ROUTES.REGISTER].includes(pathname)

  useEffect(() => {
    document.title = `${t(pageTitles[pathname] || 'auth.authentication')} | WashGo`
    window.scrollTo(0, 0)
  }, [pathname, t])

  return (
    <div className={cn(
      'relative min-h-dvh bg-slate-50 text-foreground transition-colors delay-0 duration-200 ease-in-out motion-reduce:transition-none dark:bg-background',
      isSplitLayout && 'md:h-dvh md:overflow-hidden'
    )}
    >
      {!isSplitLayout && (
        <div className="absolute right-8 top-8 z-30 hidden md:block">
          <DisplayControls variant="inline" />
        </div>
      )}
      {!isSplitLayout && (
        <div className="absolute left-8 top-8 hidden md:block">
          <AuthBrand />
        </div>
      )}
      <main className={cn(
        isSplitLayout
          ? 'grid min-h-dvh w-full grid-cols-1 bg-background md:h-dvh md:min-h-0 md:grid-cols-2 md:overflow-hidden'
          : 'mx-auto flex min-h-dvh w-full flex-col items-center justify-start px-6 py-8 sm:px-10 md:justify-center md:px-8 md:py-28'
      )}
      >
        {isSplitLayout && <AuthStory />}
        <div
          className={cn(
            isSplitLayout
              ? 'flex min-h-dvh min-w-0 flex-col md:h-dvh md:min-h-0 md:overflow-hidden'
              : 'w-full max-w-[440px]'
          )}
        >
          <header
            data-testid={isSplitLayout ? 'auth-display-toolbar' : undefined}
            className={cn('flex w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-background', isSplitLayout ? 'sticky top-0 z-30 px-6 py-2 sm:px-10 md:static md:justify-end lg:px-16' : 'mb-7 pb-5 md:hidden')}
          >
            <div className={isSplitLayout ? 'md:hidden' : undefined}>
              <AuthBrand />
            </div>
            <DisplayControls variant="inline" />
          </header>
          <div
            data-testid={isSplitLayout ? 'auth-form-panel' : undefined}
            className={isSplitLayout ? 'flex min-w-0 flex-1 flex-col items-center px-6 py-8 sm:px-10 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:pb-10 lg:px-16' : undefined}
          >
            <motion.section
              key={pathname}
              className={cn(
                'w-full',
                isSplitLayout ? 'my-auto max-w-[420px] shrink-0' : 'rounded-2xl border border-border/50 bg-card px-6 py-9 shadow-sm sm:px-9'
              )}
              aria-label={t('auth.accountVerification')}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet context={{ flow, setFlow }} />
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  )
}
