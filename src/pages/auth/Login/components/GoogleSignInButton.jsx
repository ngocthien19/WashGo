import Spinner from '~/components/ui/spinner'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FcGoogle } from 'react-icons/fc'

import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { authApi } from '~/apis/auth/authApi'
import { GOOGLE_SIGN_IN, THEME_MODES } from '~/utils/config/constants'
import { loadGoogleIdentity, subscribeGoogleCredential } from '~/utils/auth/googleIdentity'
import { getApiError } from '~/utils/http/apiError'
import { useTheme } from '~/hooks/useTheme'

export default function GoogleSignInButton({ onSuccess }) {
  const { t, i18n } = useTranslation()
  const containerRef = useRef(null)
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [renderedTheme, setRenderedTheme] = useState(null)
  const { theme } = useTheme()
  const configured = !!GOOGLE_SIGN_IN.CLIENT_ID
  const ready = renderedTheme === `${theme}:${i18n.resolvedLanguage}`

  const handleCredential = useCallback(async ({ credential }) => {
    if (pendingRef.current) {
      return
    }
    if (!credential) {
      setError('auth.noCredentialWasReceivedFromGooglePleaseTryAgain')
      return
    }
    pendingRef.current = true
    setPending(true)
    setError('')
    try {
      const session = await authApi.googleLogin(credential)
      onSuccess(session)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }, [onSuccess])

  useEffect(() => {
    if (!configured) {
      return
    }
    let active = true
    let unsubscribe
    let observer
    const container = containerRef.current

    loadGoogleIdentity().then((googleIdentity) => {
      if (!active) {
        return
      }
      unsubscribe = subscribeGoogleCredential(googleIdentity, handleCredential)
      let lastWidth = 0
      const render = () => {
        const width = Math.floor(Math.min(container.clientWidth, GOOGLE_SIGN_IN.BUTTON_MAX_WIDTH))
        if (!width || width === lastWidth) {
          return
        }
        lastWidth = width
        container.replaceChildren()
        googleIdentity.renderButton(container, {
          type: 'standard',
          theme: theme === THEME_MODES.DARK ? 'filled_black' : 'outline',
          // Google disables account personalization for medium standard buttons.
          size: 'medium',
          text: 'signin_with',
          shape: 'rectangular',
          locale: i18n.resolvedLanguage,
          width
        })
        setRenderedTheme(`${theme}:${i18n.resolvedLanguage}`)
      }
      render()
      observer = new ResizeObserver(render)
      observer.observe(container)
    }).catch((err) => {
      if (active) {
        setError(getApiError(err))
      }
    })

    return () => {
      active = false
      unsubscribe?.()
      observer?.disconnect()
      container.replaceChildren()
    }
  }, [configured, theme, handleCredential, retry, i18n.resolvedLanguage])

  return (
    <div className="mt-6">
      <div className="mb-5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('auth.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      {(!configured || (!ready && !error)) && (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full gap-3 rounded-lg text-base"
            disabled
          >
            <FcGoogle size={20} />
            {configured ? t('auth.loadingGoogle') : t('auth.signInWithGoogle')}
          </Button>
          {!configured && (
            <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
              {t('auth.googleSignInIsNotAvailableRightNowYou')}
            </p>
          )}
        </>
      )}
      <div
        ref={containerRef}
        className={`flex items-center justify-center [zoom:1.25] [&_iframe]:cursor-pointer [&_[role=button]]:cursor-pointer ${configured ? 'min-h-10' : 'hidden'} ${pending ? 'pointer-events-none opacity-50' : ''}`}
        aria-busy={pending}
        inert={pending ? true : undefined}
        data-testid="google-sign-in"
      />
      {pending && (
        <p
          role="status"
          className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Spinner
            decorative
            size={16}
          />
          {t('auth.signingIn')}
        </p>
      )}
      <FormError>
        {error}
      </FormError>
      {error && configured && (
        <Button
          type="button"
          variant="link"
          className="w-full"
          onClick={() => {
            setError('')
            setRetry((value) => value + 1)
          }}
        >
          {t('auth.retryGoogleSignIn')}
        </Button>
      )}
    </div>
  )
}
