import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Store, Star, Layers, CircleCheck, Wallet, Pencil, ImagePlus, RefreshCw, CalendarDays, MapPin, Phone, Mail, Clock, FileCheck, Building2, Hash, Info } from 'lucide-react'
import { Button } from '~/components/ui/button'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import { displayOpeningHours, formatJoinedDate } from './profileModel'
import EditProfileDialog from './components/EditProfileDialog'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { getImageUrl } from '~/utils/formats'

const fieldIcons = { businessName: Store, taxCode: Hash, address: MapPin, city: Building2, phone: Phone, email: Mail, openingHours: Clock, businessLicense: FileCheck }

export default function ProfilePage() {
  const { profile } = useOutletContext()
  const [editing, setEditing] = useState(false)
  const { t, i18n } = useTranslation()
  const shop = profile.data
  const fields = shop ? ['businessName', 'taxCode', 'address', 'city', 'phone', 'email', 'openingHours', 'businessLicense'] : []
  const status = { 1: 'active', 2: 'inactive', 3: 'suspended' }[shop?.status]
  useEffect(() => {
    document.title = `${t('merchant.nav.profile')} | WashGo`
  }, [t])
  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('merchant.nav.profile')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('merchant.profileDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 text-base"
            disabled={profile.loading}
            onClick={profile.retry}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            className="h-11 rounded-xl px-5 text-base"
            disabled={!shop || profile.loading || !!profile.error || !!shop.pendingRequest || shop.status !== 1}
            onClick={() => setEditing(true)}
          >
            <Pencil size={17} />
            {t('merchant.shop.edit')}
          </Button>
        </div>
      </div>
      {shop?.pendingRequest && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-base text-amber-800 dark:text-amber-200"
        >
          {t('merchant.shop.pending')}
        </div>
      )}
      {!shop || profile.loading || profile.error ? (
        <ResourceFeedback
          {...profile}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {Number.isFinite(shop.rating) && (
              <section className="flex items-center gap-4 rounded-2xl border border-border border-l-4 border-l-amber-500 bg-card p-5 shadow-sm">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <Star
                    className="fill-current"
                    size={22}
                  />
                </span>
                <div>
                  <h2 className="text-sm text-muted-foreground">
                    {t('merchant.shop.rating')}
                  </h2>
                  <p className="mt-1 text-2xl font-bold">
                    <AnimatedNumber
                      value={shop.rating}
                      decimals={1}
                    />
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ 5</span>
                  </p>
                </div>
              </section>
            )}
            {Number.isFinite(shop.totalOrders) && (
              <section className="flex items-center gap-4 rounded-2xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-sm">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Layers size={22} />
                </span>
                <div>
                  <h2 className="text-sm text-muted-foreground">
                    {t('merchant.totalOrders')}
                  </h2>
                  <p className="mt-1 text-2xl font-bold">
                    <AnimatedNumber value={shop.totalOrders} />
                  </p>
                </div>
              </section>
            )}
            <section className="flex items-center gap-4 rounded-2xl border border-border border-l-4 border-l-emerald-500 bg-card p-5 shadow-sm">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <Wallet size={22} />
              </span>
              <div>
                <h2 className="text-sm text-muted-foreground">
                  {t('merchant.shop.revenue')}
                </h2>
                <p className="mt-1 text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">
                  {t('merchant.shop.notUpdated')}
                </p>
              </div>
            </section>
          </div>
          <div className="grid items-start gap-5 md:grid-cols-[230px_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/5 via-card to-card p-6 text-center shadow-sm">
              <div className="relative mx-auto grid size-28 place-items-center overflow-hidden rounded-2xl border border-border bg-primary/5 text-primary">
                <Store size={44} />
                {shop.imageUrls?.[0] && (
                  <img
                    src={getImageUrl(shop.imageUrls[0])}
                    alt={shop.businessName}
                    className="absolute inset-0 size-full object-cover"
                    onError={(event) => {
                      event.currentTarget.hidden = true
                    }}
                  />
                )}
              </div>
              {!shop.imageUrls?.length && (
                <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ImagePlus size={16} />
                  {t('merchant.shop.noImage')}
                </p>
              )}
              <h2 className="mt-5 break-words text-xl font-bold">
                {shop.businessName}
              </h2>
              {status && (
                <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  <CircleCheck size={14} />
                  {t(`merchant.shop.${status}`)}
                </p>
              )}
              <dl className="mt-6 border-t border-border pt-5 text-left">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays
                    size={16}
                    className="text-primary"
                  />
                  {t('merchant.shop.joinedAt')}
                </dt>
                <dd className="mt-2 text-base font-semibold">
                  {formatJoinedDate(shop.joinedAt, i18n.resolvedLanguage) || t('merchant.shop.notUpdated')}
                </dd>
              </dl>
            </section>
            <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <h2 className="flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-5 py-5 text-lg font-bold text-foreground sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                  <Info size={21} />
                </span>
                {t('merchant.shop.details')}
              </h2>
              <dl className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
                {fields.map((key) => {
                  const Icon = fieldIcons[key]
                  const value = (key === 'openingHours' ? displayOpeningHours(shop[key]) : shop[key])?.trim()
                  return (
                    <div
                      key={key}
                      className="min-w-0 rounded-xl border border-border/60 bg-background/60 p-4"
                    >
                      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon
                          size={16}
                          className="shrink-0 text-primary/80"
                        />
                        {t(`merchant.shop.${key}`)}
                      </dt>
                      <dd className={`mt-2 break-words text-base leading-relaxed ${value ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {value || t('merchant.shop.notUpdated')}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          </div>
        </div>
      )}
      {editing && (
        <EditProfileDialog
          shop={shop}
          onClose={() => {
            setEditing(false); profile.retry()
          }}
          onSubmitted={() => {
            setEditing(false); profile.retry()
          }}
        />
      )}
    </div>
  )
}
