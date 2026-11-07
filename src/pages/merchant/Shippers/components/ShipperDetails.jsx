import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, UserRound, Phone, Mail, CalendarDays, CreditCard, Bike, Hash, Star, PackageCheck, ClipboardList, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import { formatDateTime, getImageUrl } from '~/utils/formats'

export default function ShipperDetails({ id, onClose, onEdit, editImmediately = false }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => merchantShipperApi.detail(id, signal), [id])
  const resource = useCatalogResource(load)
  const shipper = resource.data
  useEffect(() => {
    if (editImmediately && shipper) {
      onEdit(shipper)
    }
  }, [editImmediately, shipper, onEdit])
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-3xl border-primary/15"
        closeLabel="common.close"
      >
        <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserRound size={23} />
          </span>
          {t('merchant.shippers.details')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-base text-muted-foreground">
          {t('merchant.shippers.detailsHint')}
        </DialogDescription>
        {!shipper ? (
          <ResourceFeedback
            loadingText="merchant.loading"
            {...resource}
          />
        ) : (
          <div className="mt-5 grid gap-5">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-5">
              <UserAvatar
                avatar={shipper.avatar}
                fullName={shipper.fullName}
                className="size-16 text-xl ring-4 ring-primary/5"
              />
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-2xl font-bold">
                  {shipper.fullName}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays size={15} />
                  <span>
                    {t('merchant.shippers.createdAt')}
                    :
                    {' '}
                    {shipper.createdAt ? formatDateTime(shipper.createdAt) : '—'}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${shipper.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  {t(`merchant.shippers.active.${shipper.isActive}`)}
                </span>
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                  {t(`merchant.shippers.statuses.${shipper.status}`, { defaultValue: '—' })}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ key: 'totalDeliveries', Icon: PackageCheck, color: 'border-l-primary', iconColor: 'text-primary' }, { key: 'activeTaskCount', Icon: ClipboardList, color: 'border-l-emerald-500', iconColor: 'text-emerald-600 dark:text-emerald-300' }, { key: 'rating', Icon: Star, color: 'border-l-amber-500', iconColor: 'text-amber-600 dark:text-amber-300' }].map(({ key, Icon, color, iconColor }) => (
                <div
                  key={key}
                  className={`rounded-xl border border-border border-l-4 bg-card p-3 sm:p-4 ${color}`}
                >
                  <Icon
                    size={20}
                    className={`mb-2 ${iconColor}`}
                  />
                  <p className="text-2xl font-bold">
                    <AnimatedNumber
                      value={shipper[key]}
                      decimals={key === 'rating' ? 1 : 0}
                    />
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                    {t(`merchant.shippers.${key}`)}
                  </p>
                </div>
              ))}
            </div>
            <section className="overflow-hidden rounded-2xl border border-border">
              <h3 className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-4 text-base font-bold">
                <CreditCard
                  size={19}
                  className="text-primary"
                />
                {t('merchant.shippers.profileInfo')}
              </h3>
              <dl className="grid gap-x-6 px-5 sm:grid-cols-2">
                {[{ key: 'phone', Icon: Phone }, { key: 'email', Icon: Mail }, { key: 'vehicleType', Icon: Bike }, { key: 'vehiclePlate', Icon: Hash }, { key: 'identityNumber', Icon: CreditCard }].map(({ key, Icon }) => (
                  <div
                    key={key}
                    className="flex min-w-0 gap-3 border-b border-border/60 py-4 last:border-0"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">
                        {t(`merchant.shippers.${key}`)}
                      </dt>
                      <dd className="mt-1 break-words text-base font-semibold">
                        {key === 'vehicleType' ? t(`merchant.shippers.vehicles.${shipper.vehicleType}`, { defaultValue: '—' }) : shipper[key] || '—'}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>
            {shipper.identityImageUrls?.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/15 p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldCheck
                    size={19}
                    className="text-primary"
                  />
                  {t('merchant.shippers.identityImages')}
                </p>
                <div className="flex flex-wrap gap-3">
                  {shipper.identityImageUrls.map((url, index) => (
                    <a
                      key={url}
                      href={getImageUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getImageUrl(url)}
                        alt={t('merchant.shippers.photo', { number: index + 1 })}
                        className="h-32 w-44 rounded-xl border border-border bg-background p-2 object-contain transition-colors hover:border-primary"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="h-11 px-5 text-base"
              >
                {t('common.close')}
              </Button>
              <Button
                onClick={() => onEdit(shipper)}
                className="h-11 px-5 text-base"
              >
                <Pencil size={17} />
                {t('merchant.shippers.edit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
