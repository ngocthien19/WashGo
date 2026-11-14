import WorkStatusControl from './WorkStatusControl'
import AccountSecurity from '~/components/account/AccountSecurity'
import ShipperActivities from './ShipperActivities'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { UserRound, Truck, Store, ShieldCheck, Pencil, RefreshCw, LogOut, Mail, Phone, Bike } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import FormError from '~/components/ui/FormError'
import { Button } from '~/components/ui/button'
import { formatNumber, formatDateTime } from '~/utils/format/formats'
import { setUser } from '~/redux/auth/authSlice'
import ShipperPanel from '../components/ShipperPanel'
import ProfileEditor from './ProfileEditor'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { profile, logout, logoutPending } = useOutletContext()
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const [editing, setEditing] = useState(false), [revision, setRevision] = useState(0)
  const user = profile.data || (profile.error && authUser ? { fullName: authUser.fullName, email: authUser.email, phone: authUser.phone, avatarUrl: authUser.avatar } : null)
  useEffect(() => {
    document.title = `${t('shipper.nav.profile')} | WashGo`
  }, [t])
  return (
    <Reveal className="mx-auto max-w-[1400px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t('shipper.nav.profile')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('shipper.profileDescription')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-11 px-5"
            onClick={() => {
              profile.retry(); setRevision(value => value + 1)
            }}
            disabled={profile.loading}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            className="h-11 px-5 text-base"
            disabled={!profile.data || profile.loading}
            onClick={() => setEditing(true)}
          >
            <Pencil size={18} />
            {t('shipper.edit')}
          </Button>
        </div>
      </header>
      {profile.data && !profile.loading && (
        <WorkStatusControl
          key={profile.data.revision}
          profile={profile.data}
          onUpdated={profile.retry}
        />
      )}
      {profile.error && (
        <FormError>
          {profile.error === 'shipper.profileMissing' ? 'shipper.profileMissingHint' : profile.error}
        </FormError>
      )}
      {profile.loading || !user ? <ResourceFeedback {...profile} /> : (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="h-24 bg-gradient-to-br from-primary/15 to-primary/5" />
            <div className="px-5 pb-6 text-center">
              <UserAvatar
                avatar={user.avatarUrl}
                fullName={user.fullName}
                alt={t('shipper.avatar')}
                className="relative mx-auto -mt-12 size-24 rounded-2xl border-4 border-card text-2xl shadow-sm"
              />
              <h2 className="mt-4 break-words text-xl font-bold">
                {user.fullName}
              </h2>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {user.email}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                {t('shipper.role')}
              </span>
            </div>
            <dl className="grid gap-3 border-t border-border p-5 text-center">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('shipper.lifetime')}
                </dt>
                <dd className="mt-2 text-xl font-bold text-primary">
                  {formatNumber(user.totalDeliveries)}
                </dd>
              </div>
            </dl>
          </section>
          <div className="min-w-0 space-y-5">
            <ShipperPanel
              title={t('shipper.account')}
              icon={UserRound}
            >
              <div className="p-5">
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[['fullName', user.fullName, UserRound], ['email', user.email, Mail], ['phone', user.phone, Phone], ['vehicleType', user.vehicleType ? t(`merchant.shippers.vehicles.${user.vehicleType}`) : null, Bike], ['vehiclePlate', user.vehiclePlate, Truck]].map(([key, value, Icon]) => (
                    <div
                      key={key}
                      className={key === 'vehiclePlate' ? 'min-w-0 sm:col-span-2' : 'min-w-0'}
                    >
                      <dt className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon
                          size={16}
                          className="text-primary"
                        />
                        {t(`merchant.shippers.${key}`)}
                      </dt>
                      <dd className="break-words rounded-xl border border-border bg-muted/20 p-3 text-base font-medium">
                        {value || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </ShipperPanel>
            <ShipperPanel
              title={t('shipper.work')}
              icon={Truck}
              tone="blue"
            >
              <div className="mx-5 mt-5 flex items-center gap-4 rounded-xl border border-primary/10 bg-primary/3 p-4">
                <ResourceThumbnail
                  urls={user.merchantImageUrls || []}
                  name={user.merchantName || t('shipper.merchant')}
                  icon={Store}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('shipper.merchant')}
                  </p>
                  <h3 className="mt-1 break-words text-lg font-semibold">
                    {user.merchantName || '—'}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <Phone
                      size={16}
                      className="shrink-0 text-primary"
                    />
                    {user.merchantPhone ? (
                      <a
                        href={`tel:${String(user.merchantPhone).replace(/[^+0-9]/g, '')}`}
                        className="text-primary hover:underline"
                      >
                        {user.merchantPhone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('shipper.merchantPhoneMissing')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-2 px-5 pt-4 text-sm text-muted-foreground">
                {user.merchantEmail && (
                  <p>
                    <a
                      className="hover:text-primary hover:underline"
                      href={`mailto:${user.merchantEmail}`}
                    >
                      {user.merchantEmail}
                    </a>
                  </p>
                )}
                {user.merchantAddress && (
                  <p>
                    {user.merchantAddress}
                  </p>
                )}
                {user.createdAt && (
                  <p>
                    {t('shipper.sync.joined')}
                    :
                    {' '}
                    {formatDateTime(user.createdAt)}
                  </p>
                )}
                {user.updatedAt && (
                  <p>
                    {t('shipper.sync.updated')}
                    :
                    {' '}
                    {formatDateTime(user.updatedAt)}
                  </p>
                )}
              </div>
              <dl className="grid gap-4 p-5 sm:grid-cols-2">
                {[[ShieldCheck, 'workState', typeof user.isActive === 'boolean' ? t(`merchant.shippers.active.${user.isActive}`) : null], [Truck, 'status', user.status ? t(`merchant.shippers.statuses.${user.status}`) : null]].map(([Icon, key, value]) => (
                  <div key={key}>
                    <dt className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon size={16} />
                      {t(`shipper.${key}`)}
                    </dt>
                    <dd className="break-words font-semibold">
                      {value || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
                {t('shipper.workHint')}
              </p>
            </ShipperPanel>
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
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
                disabled={logoutPending}
                onClick={logout}
              >
                <LogOut size={17} />
                {t(logoutPending ? 'common.signingOut' : 'common.signOut')}
              </Button>
            </section>
          </div>
        </div>
      )}
      {profile.data && (
        <>
          <AccountSecurity revision={revision} />
          <ShipperActivities revision={revision} />
        </>
      )}
      {editing && profile.data && (
        <ProfileEditor
          profile={user}
          onClose={() => {
            setEditing(false); profile.retry()
          }}
          onSaved={(updated) => {
            dispatch(setUser({ ...authUser, fullName: updated.fullName, phone: updated.phone, avatar: updated.avatarUrl })); setEditing(false); profile.retry()
          }}
        />
      )}
    </Reveal>
  )
}
