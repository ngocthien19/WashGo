import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { adminAccountApi, accountOperations } from '~/apis/admin/adminAccountApi'
import { formatDateTime } from '~/utils/format/formats'
import { AccountField, AccountShell } from './AccountUI'
import useAccountCommand from './useAccountCommand'

const schema = yup.object({ newEmail: yup.string().trim().required('accounts.validation.required').email('accounts.validation.email').max(100, 'accounts.validation.email'), code: yup.string() })
export default function AccountEmailDialog({ account, onClose, onSaved }) {
  const { t } = useTranslation()
  const form = useForm({ resolver: yupResolver(schema), defaultValues: { newEmail: '', code: '' } })
  const [challenge, setChallenge] = useState(null)
  const [retryAt, setRetryAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [challengeUnknown, setChallengeUnknown] = useState(false)
  const command = useAccountCommand({ requiresAuthentication: account.capabilities.requiresReauthentication, onSaved, setFieldError: form.setError })
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer)
  }, [])
  const requestCode = form.handleSubmit(values => command.run(async () => {
    if (Date.now() < retryAt || challengeUnknown) {
      return
    }
    try {
      const value = await adminAccountApi.emailChallenge(account.id, { expectedRevision: account.revision, newEmail: values.newEmail.trim() })
      setChallenge(value); setRetryAt(Date.now() + 60000)
    } catch (failure) {
      if (!failure.response || failure.response.status >= 500) {
        setChallengeUnknown(true); command.setError('accounts.emailChallengeUnknown'); return
      }
      if (failure.response.status === 429) {
        setRetryAt(Date.now() + 60000)
      }
      throw failure
    }
  }))
  const submit = form.handleSubmit(values => {
    if (!challenge) {
      requestCode(); return
    }
    if (!/^\d{6}$/.test(values.code)) {
      form.setError('code', { message: 'accounts.validation.code' }); return
    }
    if (Date.parse(challenge.expiresAt) <= now) {
      form.setError('code', { message: 'accounts.expiredCode' }); return
    }
    command.run(() => accountOperations.send({ action: 'EmailChange', resourceId: account.id, suffix: `/${account.id}/email-change/confirm`, body: { expectedRevision: account.revision, newEmail: challenge.newEmail, code: values.code } }))
  })
  const disabled = command.pending || command.locked || challengeUnknown
  return (
    <AccountShell
      title="accounts.actions.ChangeEmail"
      description="accounts.descriptions.ChangeEmail"
      onClose={onClose}
      busy={command.pending}
      onSubmit={submit}
      footer={(
        <>
          <Button
            variant="secondary"
            type="button"
            disabled={command.pending}
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
          <Button
            type="submit"
            disabled={disabled}
          >
            {t(command.pending ? 'accounts.saving' : challenge ? 'accounts.confirm' : 'accounts.sendCode')}
          </Button>
        </>
      )}
    >
      <p className="break-words rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
        {t('accounts.currentEmail')}
        :
        {' '}
        {account.email}
      </p>
      <FormError>
        {command.error}
      </FormError>
      <AccountField
        label="newEmail"
        type="email"
        autoComplete="email"
        required
        {...form.register('newEmail')}
        error={form.formState.errors.newEmail}
        disabled={disabled || Boolean(challenge)}
      />
      {challenge && (
        <section className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="break-words text-sm leading-relaxed">
            {t('accounts.codeSent', { email: challenge.newEmail, expires: formatDateTime(challenge.expiresAt) })}
          </p>
          <AccountField
            label="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            {...form.register('code')}
            error={form.formState.errors.code}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || now < retryAt}
            onClick={requestCode}
          >
            {now < retryAt ? t('accounts.resendAfter', { seconds: Math.ceil((retryAt - now) / 1000) }) : t('accounts.resend')}
          </Button>
        </section>
      )}
      {command.authentication}
    </AccountShell>
  )
}
