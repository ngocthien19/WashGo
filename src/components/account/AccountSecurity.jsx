import TablePagination from '~/components/Pagination/TablePagination'
import { ShieldCheck, KeyRound, MonitorSmartphone, LogOut, LogIn, Clock3, CalendarClock } from 'lucide-react'
import TruncatedText from '~/components/TruncatedText'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { accountSecurityApi } from '~/apis/auth/accountSecurityApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import FormError from '~/components/ui/FormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { formatDateTime } from '~/utils/formats'

const schema = yup.object({ currentPassword: yup.string().required('admin.workspaceSync.currentPasswordRequired'), newPassword: yup.string().min(8, 'admin.workspaceSync.passwordRules').max(128, 'admin.workspaceSync.passwordRules').matches(/[A-Z]/, 'admin.workspaceSync.passwordRules').matches(/[a-z]/, 'admin.workspaceSync.passwordRules').matches(/\d/, 'admin.workspaceSync.passwordRules').notOneOf([yup.ref('currentPassword')], 'admin.workspaceSync.passwordRules').required('admin.workspaceSync.passwordRules'), confirmNewPassword: yup.string().oneOf([yup.ref('newPassword')], 'admin.workspaceSync.passwordMatch').required('admin.workspaceSync.passwordMatch'), revokeOtherSessions: yup.boolean() })
function PasswordDialog({ onClose, onSaved }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '', revokeOtherSessions: true } })
  const lock = useRef(false)
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const submit = async values => {
    if (lock.current || blocked) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      await accountSecurityApi.password(values); reset(); notify.success('admin.workspaceSync.passwordSaved'); onSaved()
    } catch (failure) {
      const unknown = !failure.response || failure.response.status >= 500; setBlocked(unknown || failure.response?.status === 429); setError(unknown ? 'admin.workspaceSync.unknown' : failure.response?.status === 429 ? 'admin.workspaceSync.passwordRateLimit' : getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !lock.current) {
          reset(); onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <KeyRound />
            {t('admin.profile.password')}
          </DialogTitle>
          <DialogDescription className="mt-4 leading-6 text-muted-foreground">
            {t('admin.workspaceSync.passwordRules')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 space-y-4"
          onSubmit={event => handleSubmit(submit)(event)}
        >
          <FormError>
            {error}
          </FormError>
          <fieldset
            disabled={busy || blocked}
            className="space-y-4"
          >
            {['currentPassword', 'newPassword', 'confirmNewPassword'].map(key => (
              <label
                key={key}
                className="grid gap-2"
              >
                {t(`admin.workspaceSync.${key}`)}
                <Input
                  {...register(key)}
                  aria-label={t(`admin.workspaceSync.${key}`)}
                  type="password"
                  maxLength={128}
                  autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                  className="h-12 text-base"
                />
                <FormError>
                  {errors[key]?.message}
                </FormError>
              </label>
            ))}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                {...register('revokeOtherSessions')}
                className="mt-1 size-5"
              />
              {t('admin.workspaceSync.revokeOnPassword')}
            </label>
          </fieldset>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                reset(); onClose()
              }}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={busy || blocked}
              className="h-11 px-5 text-base"
            >
              {t('admin.workspaceSync.save')}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default function AccountSecurity({ revision = 0 }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const security = useCatalogResource(accountSecurityApi.security, revision), sessions = useCatalogResource(useCallback(signal => accountSecurityApi.sessions(signal, { page, take: 10 }), [page]), revision)
  const sessionRows = sessions.data ? [...(sessions.data.current && !sessions.data.items.some(row => row.id === sessions.data.current.id) ? [sessions.data.current] : []), ...sessions.data.items] : []
  const [passwordOpen, setPasswordOpen] = useState(false), [target, setTarget] = useState(null), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const refresh = () => {
    security.retry(); sessions.retry()
  }
  const revoke = async () => {
    if (lock.current || blocked) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await accountSecurityApi.revoke(target.id); if (result.stale) {
        notify.error('admin.workspaceSync.sessionStale')
      } else {
        notify.success('admin.workspaceSync.sessionsRevoked', { count: result.revoked })
      }; setTarget(null); refresh()
    } catch (failure) {
      const unknown = !failure.response || failure.response.status >= 500; setBlocked(unknown); setError(unknown ? 'admin.workspaceSync.unknown' : getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <section
      data-pagination-scope
      className="mt-7 min-w-0 space-y-5 rounded-xl border border-border pb-5"
    >
      <h2 className="flex items-center gap-3 rounded-t-xl border-b border-primary/15 bg-primary/5 p-5 text-lg font-bold">
        <ShieldCheck className="size-5 text-primary" />
        {t('admin.profile.security')}
      </h2>
      {security.loading || security.error || !security.data ? (
        <ResourceFeedback
          {...security}
          loadingText="admin.loading"
        />
      ) : (
        <div className="mx-5 space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
          <p>
            <strong className="font-semibold">
              {t('admin.workspaceSync.passwordChangedAt')}
            </strong>
            :
            {' '}
            {formatDateTime(security.data.passwordChangedAt)}
          </p>
          <p>
            {t('admin.workspaceSync.activeSessions', { count: security.data.activeSessions })}
          </p>
          <Button
            variant="destructive"
            disabled={!security.data.hasPassword}
            onClick={() => setPasswordOpen(true)}
            className="h-11 px-5 text-base"
          >
            {t('admin.profile.password')}
          </Button>
          {!security.data.hasPassword && (
            <p className="text-sm text-muted-foreground">
              {t('admin.workspaceSync.googlePassword')}
            </p>
          )}
        </div>
      )}
      <h3 className="mx-5 flex items-center gap-2 font-semibold">
        <MonitorSmartphone className="size-5 text-primary" />
        {t('admin.workspaceSync.sessions')}
      </h3>
      {sessions.loading || sessions.error || !sessions.data ? (
        <ResourceFeedback
          {...sessions}
          loadingText="admin.loading"
        />
      ) : (
        <>
          <ul className="mx-5 space-y-3">
            {sessionRows.map(row => (
              <li
                key={row.id}
                className="min-w-0 space-y-4 rounded-xl border border-border bg-muted/10 p-4"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <MonitorSmartphone className="size-5 shrink-0 text-primary" />
                  <TruncatedText className="flex-1 font-semibold">
                    {row.userAgent || t('admin.workspaceSync.unknownDevice')}
                  </TruncatedText>
                  {row.isCurrent && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {t('admin.workspaceSync.currentSession')}
                    </span>
                  )}
                </div>
                <dl className="grid gap-3 rounded-lg bg-card p-3 sm:grid-cols-3">
                  {[['signedIn', 'startedAt', LogIn], ['lastActive', 'lastActiveAt', Clock3], ['expires', 'expiresAt', CalendarClock]].map(([label, field, Icon]) => (
                    <div
                      key={field}
                      className="min-w-0"
                    >
                      <dt className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                        <Icon className="size-4 text-primary" />
                        {t(`admin.workspaceSync.${label}`)}
                      </dt>
                      <dd className="text-sm leading-6 text-muted-foreground">
                        {formatDateTime(row[field])}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!row.isCurrent && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTarget(row); setBlocked(false); setError('')
                    }}
                    className="h-11 px-5 text-base"
                  >
                    {t('common.signOut')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <TablePagination
            currentPage={page}
            totalPages={Math.ceil(sessions.data.total / sessions.data.take)}
            total={sessions.data.total}
            pageSize={sessions.data.take}
            rowCount={sessions.data.items.length}
            onPageChange={setPage}
          />
          <Button
            variant="destructive"
            disabled={!(sessions.data.total > (sessions.data.current ? 1 : 0))}
            onClick={() => {
              setTarget({ id: null }); setBlocked(false); setError('')
            }}
            className="mx-5 h-auto min-h-11 max-w-[calc(100%-2.5rem)] whitespace-normal px-5 py-2.5 text-base"
          >
            <LogOut className="size-4" />
            {t('admin.workspaceSync.revokeOthers')}
          </Button>
        </>
      )}
      {passwordOpen && (
        <PasswordDialog
          onClose={() => setPasswordOpen(false)}
          onSaved={() => {
            setPasswordOpen(false); refresh()
          }}
        />
      )}
      {target && (
        <Dialog
          open
          onOpenChange={open => {
            if (!open && !lock.current) {
              setTarget(null); refresh()
            }
          }}
        >
          <DialogContent
            closeLabel="common.close"
            className="max-w-lg"
          >
            <DialogHeader tone="warning">
              <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
                <KeyRound />
                {t('admin.workspaceSync.revokeTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('admin.workspaceSync.revokeHint')}
              </DialogDescription>
            </DialogHeader>
            <FormError>
              {error}
            </FormError>
            <footer className="mt-5 flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setTarget(null); refresh()
                }}
                className="h-11 px-5 text-base"
              >
                {t('common.close')}
              </Button>
              <Button
                variant="destructive"
                disabled={busy || blocked}
                onClick={revoke}
                className="h-11 px-5 text-base"
              >
                {t('common.signOut')}
              </Button>
            </footer>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
