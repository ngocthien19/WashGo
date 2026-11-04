import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import AuthStory from './components/AuthStory'
import { AUTH_ROUTES } from '~/utils/constants'
import { cn } from '~/lib/utils'
import AuthBrand from '~/pages/auth/components/AuthBrand'

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
      'min-h-dvh bg-slate-50 text-foreground transition-colors delay-0 duration-200 ease-in-out motion-reduce:transition-none dark:bg-background',
      isSplitLayout && 'md:h-dvh md:overflow-hidden'
    )}
    >
      <main className={cn(
        isSplitLayout
          ? 'grid min-h-dvh w-full grid-cols-1 bg-background md:h-dvh md:min-h-0 md:grid-cols-2 md:overflow-hidden'
          : 'mx-auto flex min-h-dvh w-full flex-col items-center justify-center px-5 py-10 sm:px-8'
      )}
      >
        {isSplitLayout && <AuthStory />}
        <div
          className={cn(
            isSplitLayout
              ? 'flex min-h-dvh min-w-0 flex-col items-center px-6 py-8 sm:px-10 md:h-dvh md:min-h-0 md:overflow-y-auto md:overscroll-contain md:px-10 lg:px-16'
              : 'w-full max-w-[440px]'
          )}
          data-testid={isSplitLayout ? 'auth-form-panel' : undefined}
        >
          {!isSplitLayout && (
            <div className="mb-8 flex justify-center">
              <AuthBrand />
            </div>
          )}
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
      </main>
    </div>
  )
}
