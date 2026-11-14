import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { LogOut, UserRound } from 'lucide-react'
import { authApi } from '~/apis/auth/authApi'
import { clearSession } from '~/redux/auth/authSlice'
import { getApiError } from '~/utils/http/apiError'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import logo from '~/assets/logo-washgo.svg'

export default function RoleHome({ title, description, actions, children, showIdentity = true }) {
  const { t } = useTranslation()
  const { user, refreshToken } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    document.title = `${title} | WashGo`
  }, [title])

  const logout = async () => {
    setPending(true)
    setError('')
    try {
      await authApi.logout(refreshToken)
      window.google?.accounts?.id?.disableAutoSelect?.()
      dispatch(clearSession())
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 py-5 pl-6 pr-32 sm:pr-36">
          <div className="flex items-center gap-3 text-xl font-bold">
            <img
              src={logo}
              alt=""
              className="size-10"
            />
            WashGo
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <Button
              variant="outline"
              disabled={pending}
              onClick={logout}
            >
              <LogOut size={16} />
              {pending ? t('common.signingOut') : t('common.signOut')}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {description}
        </p>
        {showIdentity && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-primary/10 p-3 text-primary">
                <UserRound size={24} />
              </span>
              <h2 className="text-xl font-semibold">
                {t('common.hello', { value1: user?.fullName || t('common.there') })}
              </h2>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  {t('common.email')}
                </dt>
                <dd className="mt-1 break-words">
                  {user?.email}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t('common.role')}
                </dt>
                <dd className="mt-1">
                  {user?.role}
                </dd>
              </div>
            </dl>
          </section>
        )}
        {children && (
          <div className="mt-8">
            {children}
          </div>
        )}
        <div className="mt-4">
          <FormError>
            {error}
          </FormError>
        </div>
      </main>
    </div>
  )
}
