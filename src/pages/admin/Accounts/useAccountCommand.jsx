import { useRef, useState } from 'react'
import { adminAccountApi } from '~/apis/admin/adminAccountApi'
import { AccountAuthentication } from './AccountUI'
import { accountError, applyAccountFieldErrors } from './accountModel'

export default function useAccountCommand({ requiresAuthentication = false, onSaved, setFieldError, onFailure }) {
  const lock = useRef(false)
  const authenticated = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const [stale, setStale] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(requiresAuthentication)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const run = async action => {
    if (lock.current || unknown || stale) {
      return
    }
    lock.current = true; setPending(true); setError(''); setPasswordError('')
    try {
      if ((requiresAuthentication || needsPassword) && !authenticated.current) {
        if (!password) {
          setNeedsPassword(true); setPasswordError('accounts.validation.required'); return
        }
        try {
          await adminAccountApi.reauthenticate(password); authenticated.current = true; setPassword('')
        } catch (failure) {
          setPasswordError(accountError(failure)); return
        }
      }
      const value = await action()
      if (value !== undefined) {
        onSaved(value)
      }
    } catch (failure) {
      onFailure?.(failure)
      const code = failure.response?.data?.meta?.code
      if (code === 'ReauthenticationRequired') {
        authenticated.current = false; setNeedsPassword(true)
      }
      if (code === 'RevisionConflict') {
        setStale(true)
      }
      if (setFieldError) {
        applyAccountFieldErrors(failure, setFieldError)
      }
      setUnknown(Boolean(failure.uncertain)); setError(accountError(failure))
    } finally {
      lock.current = false; setPending(false)
    }
  }
  return { pending, error, setError, locked: unknown || stale, run,
    authentication: needsPassword || requiresAuthentication ? (
      <AccountAuthentication
        password={password}
        setPassword={setPassword}
        error={passwordError}
        disabled={pending || unknown || stale}
      />
    ) : null }
}
