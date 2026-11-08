import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { UserRound, Mail, Phone, ShieldCheck, CalendarDays, History, LockKeyhole, Fingerprint, LogOut, Pencil, RefreshCw } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'

export default function ProfilePage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${t('admin.nav.profile')} | WashGo`
  }, [t])
  const { profile, logout, logoutPending } = useOutletContext()
  const user = profile.data
  return (
    <Reveal className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t('admin.nav.profile')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('admin.profile.description')}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-5 text-base"
          onClick={profile.retry}
          disabled={profile.loading}
        >
          <RefreshCw size={17} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      {profile.loading || profile.error || !user ? (
        <ResourceFeedback
          {...profile}
          loadingText="admin.loading"
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="h-24 bg-gradient-to-br from-primary/80 to-indigo-500/80" />
              <div className="px-5 pb-6 text-center">
                <UserAvatar
                  avatar={user.avatar}
                  fullName={user.fullName}
                  alt={t('admin.profile.avatar')}
                  className="relative mx-auto -mt-12 size-24 rounded-2xl border-4 border-card text-2xl shadow-sm"
                />
                <h2 className="mt-4 break-words text-xl font-bold">
                  {user.fullName}
                </h2>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {user.email}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  <ShieldCheck size={15} />
                  {t('admin.workspace')}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-border px-5 py-4 text-sm">
                {[['joined', CalendarDays], ['status', ShieldCheck]].map(([key, Icon]) => (
                  <div key={key}>
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon size={14} />
                      {t(`admin.profile.${key}`)}
                    </dt>
                    <dd className="mt-2 font-semibold">—</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <History
                  size={18}
                  className="text-primary"
                />
                {t('admin.profile.activity')}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {t('admin.profile.activityUnavailable')}
              </p>
            </section>
          </aside>
          <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <UserRound
                  size={20}
                  className="text-primary"
                />
                {t('admin.profile.account')}
              </h2>
              <Button
                variant="outline"
                disabled
                className="h-11 px-5 text-base"
              >
                <Pencil size={17} />
                {t('admin.profile.edit')}
              </Button>
            </div>
            <p className="mt-4 rounded-xl bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
              {t('admin.profile.editUnavailable')}
            </p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {[['fullName', UserRound, user.fullName], ['email', Mail, user.email], ['phone', Phone, user.phone], ['role', ShieldCheck, t('admin.workspace')]].map(([key, Icon, value]) => (
                <div
                  key={key}
                  className="min-w-0"
                >
                  <dt className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon size={16} />
                    {t(`admin.profile.${key}`)}
                  </dt>
                  <dd className="min-h-12 break-words rounded-xl border border-border/60 bg-muted/30 px-4 py-3 font-semibold">
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 border-t border-border pt-6">
              <h2 className="text-base font-bold">
                {t('admin.profile.security')}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[['password', LockKeyhole], ['twoFactor', Fingerprint]].map(([key, Icon]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <p className="flex items-center gap-2 font-semibold">
                      <Icon
                        size={18}
                        className="text-primary"
                      />
                      {t(`admin.profile.${key}`)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {t('admin.profile.securityUnavailable')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/20">
              <div>
                <h2 className="font-bold">
                  {t('admin.profile.session')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('admin.profile.sessionNote')}
                </p>
              </div>
              <Button
                variant="destructive"
                className="h-11 px-5 text-base font-semibold"
                disabled={logoutPending}
                onClick={logout}
              >
                <LogOut size={17} />
                {t(logoutPending ? 'common.signingOut' : 'common.signOut')}
              </Button>
            </div>
          </section>
        </div>
      )}
    </Reveal>
  )
}
