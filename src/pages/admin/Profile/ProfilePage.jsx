import TruncatedText from '~/components/TruncatedText'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUser } from '~/redux/auth/authSlice'
import { adminWorkspaceApi } from '~/apis/admin/adminWorkspaceApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ProfileEditor from './ProfileEditor'
import AccountSecurity from './AccountSecurity'
import AuditPanel from '../Audit/AuditPanel'
import { formatDateTime } from '~/utils/formats'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { UserRound, Mail, Phone, ShieldCheck, CalendarDays, LogOut, Pencil, RefreshCw } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'

export default function ProfilePage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${t('admin.nav.profile')} | WashGo`
  }, [t])
  const { logout, logoutPending, profile: layoutProfile } = useOutletContext()
  const profile = useCatalogResource(adminWorkspaceApi.profile)
  const [editing, setEditing] = useState(false)
  const dispatch = useDispatch()
  const authUser = useSelector(state => state.auth.user)
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
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-11 px-5 text-base"
            onClick={() => {
              profile.retry(); layoutProfile.retry()
            }}
            disabled={profile.loading}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            variant="default"
            disabled={!user?.editableFields.length}
            onClick={() => setEditing(true)}
            className="h-11 px-5 text-base"
          >
            <Pencil size={17} />
            {t('admin.profile.edit')}
          </Button>
        </div>
      </header>
      {profile.loading || profile.error || !user ? (
        <ResourceFeedback
          {...profile}
          loadingText="admin.loading"
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
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
                <h2 className="mt-4 text-xl font-bold">
                  <TruncatedText>
                    {user.fullName}
                  </TruncatedText>
                </h2>
                <p className="mt-2 min-w-0 text-sm text-muted-foreground">
                  <TruncatedText>
                    {user.email}
                  </TruncatedText>
                </p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  <ShieldCheck size={15} />
                  {t('admin.workspace')}
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 lg:grid-cols-[1.2fr_1fr] border-t border-border px-5 py-4 text-sm">
                {[['joined', CalendarDays], ['status', ShieldCheck]].map(([key, Icon]) => (
                  <div
                    key={key}
                    className={key === 'status' ? 'flex flex-col items-end text-right' : ''}
                  >
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon size={14} />
                      {t(`admin.profile.${key}`)}
                    </dt>
                    <dd className="mt-2 whitespace-nowrap font-semibold">
                      {key === 'joined' ? formatDateTime(user.joinedAt) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.accountStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
                          {t(`admin.workspaceSync.accountStatuses.${user.accountStatus}`)}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            <AuditPanel personal />
          </aside>
          <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="-mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 px-5 py-5 sm:-mx-6 sm:-mt-6 sm:px-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <UserRound
                  size={20}
                  className="text-primary"
                />
                {t('admin.profile.account')}
              </h2>

            </div>
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
                  <dd className="min-w-0 min-h-12 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-base font-medium">
                    <TruncatedText>
                      {value}
                    </TruncatedText>
                  </dd>
                </div>
              ))}
            </dl>
            <AccountSecurity />
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div>
                <h2 className="flex items-center gap-2 font-bold">
                  <LogOut className="size-5 text-primary" />
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
      {editing && user && (
        <ProfileEditor
          user={user}
          onClose={() => {
            setEditing(false); profile.retry()
          }}
          onSaved={saved => {
            if (authUser?.id === saved.id) {
              dispatch(setUser({ ...authUser, fullName: saved.fullName, phone: saved.phone, avatar: saved.avatar }))
            }
            setEditing(false); profile.retry(); layoutProfile.retry()
          }}
        />
      )}
    </Reveal>
  )
}
