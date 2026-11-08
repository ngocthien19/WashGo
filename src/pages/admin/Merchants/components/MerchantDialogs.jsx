import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Store, LockKeyhole, LockKeyholeOpen, Contact, FileBadge, MapPin, Handshake, Package, Clock, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceGallery from '~/components/ResourceThumbnail/ResourceGallery'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminMerchantApi } from '~/apis/admin/adminMerchantApi'
import { formatCurrency, formatNumber, getImageUrl } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { merchantSnapshot, displayJsonText, contractDay, safeDocumentUrl, unknownWrite } from '../merchantModel'
import MerchantEditor from './MerchantEditor'
import MerchantDialogHeader from './MerchantDialogHeader'

export function MerchantStatus({ status }) {
  const { t } = useTranslation()
  const color = { 1: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 2: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', 3: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' }[status] || 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${color}`}>
      {t(`admin.merchants.statuses.${status}`)}
    </span>
  )
}
function Detail({ merchant, onClose }) {
  const { t } = useTranslation()
  const groups = [
    { key: 'contact', icon: Contact, fields: ['email', 'phone', 'openingHours'] },
    { key: 'legal', icon: FileBadge, fields: ['taxCode', 'businessLicense'] },
    { key: 'location', icon: MapPin, fields: ['address', 'city', 'serviceRadiusKm', 'maxCapacity'] },
    { key: 'contract', icon: Handshake, fields: ['depositAmount', 'commissionRate', 'contractStartDate', 'contractEndDate', 'slaDocUrl'] }
  ]
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
        closeLabel="common.close"
        className="max-w-3xl"
      >
        <MerchantDialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store size={24} />
            </span>
            {merchant.businessName}
          </DialogTitle>
          <DialogDescription className="mt-3 flex items-center gap-3">
            <MerchantStatus status={merchant.status} />
          </DialogDescription>
        </MerchantDialogHeader>
        <div className="mt-5 space-y-5">
          <ResourceGallery
            urls={merchant.imageUrls || []}
            name={merchant.businessName}
            thumbnails
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {[['totalOrders', formatNumber(merchant.totalOrders), Package, 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'], ['unfinishedOrders', formatNumber(merchant.unfinishedOrders), Clock, 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'], ['paidValue', formatCurrency(merchant.totalRevenue), Wallet, 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300']].map(([key, value, Icon, color]) => (
              <div
                key={key}
                className={`min-w-0 rounded-xl border p-4 ${color}`}
              >
                <Icon
                  size={18}
                  className="mb-3"
                />
                <p className="text-xs leading-5">
                  {t(`admin.merchants.${key}`)}
                </p>
                <p className="mt-2 break-words text-xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(({ key: groupKey, icon: Icon, fields }) => (
              <section
                key={groupKey}
                className="min-w-0 rounded-2xl border border-border bg-card p-4"
              >
                <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon size={17} />
                  </span>
                  {t(`admin.merchants.detailGroups.${groupKey}`)}
                </h3>
                <dl className="space-y-4">
                  {fields.map((key) => (
                    <div
                      key={key}
                      className="min-w-0"
                    >
                      <dt className="text-xs text-muted-foreground">
                        {t(`admin.merchants.fields.${key}`)}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                        {['businessLicense', 'openingHours'].includes(key) ? displayJsonText(merchant[key]) || '—' : key === 'slaDocUrl' && merchant[key] && safeDocumentUrl(merchant[key]) ? (
                          <a
                            className="text-primary underline"
                            href={getImageUrl(merchant[key])}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('admin.merchants.openDocument')}
                          </a>
                        ) : key === 'depositAmount' ? formatCurrency(merchant[key]) : key === 'commissionRate' ? Number.isFinite(merchant[key]) ? `${merchant[key]}%` : '—' : key.includes('Date') ? contractDay(merchant[key]).split('-').reverse().join('/') || '—' : merchant[key] == null || merchant[key] === '' ? '—' : String(merchant[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          {merchant.rejectionReason && (
            <p className="rounded-xl bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
              {t('admin.merchants.reason')}
              :
              {' '}
              {merchant.rejectionReason}
            </p>
          )}
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              variant="secondary"
              className="h-11 px-5 text-base font-semibold"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
function StatusDialog({ merchant, onClose, onSaved }) {
  const { t } = useTranslation()
  const locking = merchant.status === 1
  const [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || blocked || locking && (!reason.trim() || reason.trim().length > 1000 || merchant.unfinishedOrders > 0 && !confirmed)) {
      return
    }
    lock.current = true; setPending(true); setError('')
    let writing = false
    try {
      const latest = await adminMerchantApi.detail(merchant.id)
      if (merchantSnapshot(latest) !== merchantSnapshot(merchant) || latest.unfinishedOrders !== merchant.unfinishedOrders) {
        setError('admin.merchants.changed'); setBlocked(true); return
      }
      writing = true
      await adminMerchantApi.status(merchant.id, locking ? 3 : 1, locking ? reason.trim() : null, locking && confirmed)
      notify.success(locking ? 'admin.merchants.locked' : 'admin.merchants.unlocked'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      setBlocked(unknown || failure.response?.status === 409)
      const message = unknown ? 'admin.merchants.uncertain' : failure.response?.status === 409 ? 'admin.merchants.lockConflict' : getApiError(failure)
      setError(message); notify.error(message)
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const Icon = locking ? LockKeyhole : LockKeyholeOpen
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) {
          onClose()
        }
      }}
    >
      <DialogContent closeLabel="common.close">
        <MerchantDialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-semibold">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${locking ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
              <Icon size={24} />
            </span>
            {t(locking ? 'admin.merchants.lock' : 'admin.merchants.unlock')}
          </DialogTitle>
          <DialogDescription className="mt-4 text-sm leading-6 text-muted-foreground">
            {t(locking ? 'admin.merchants.lockHint' : 'admin.merchants.unlockHint')}
          </DialogDescription>
        </MerchantDialogHeader>
        <div className={`mt-5 flex items-center gap-3 rounded-xl border p-4 ${locking ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20' : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
          <Store
            size={20}
            className="shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="break-words text-base font-medium">
              {merchant.businessName}
            </p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {merchant.email}
            </p>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="mt-5 space-y-5"
        >
          <fieldset
            disabled={pending || blocked}
            className="space-y-5"
          >
            {locking ? (
              <>
                <label className="flex flex-col gap-3 text-sm font-medium">
                  <span>
                    {t('admin.merchants.reason')}
                    {' '}
                    <span className="text-destructive">*</span>
                  </span>
                  <textarea
                    required
                    maxLength={1000}
                    value={reason}
                    placeholder={t('admin.merchants.reasonPlaceholder')}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-input bg-background p-3 text-base font-normal outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                {merchant.unfinishedOrders > 0 && (
                  <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 dark:border-amber-900 dark:bg-amber-950/20">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={setConfirmed}
                      className="mt-1"
                    />
                    <span>
                      {t('admin.merchants.confirmUnfinished', { count: merchant.unfinishedOrders })}
                    </span>
                  </label>
                )}
              </>
            ) : null}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onClose}
              className="h-11 px-5 text-base font-semibold"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={pending || blocked || locking && (!reason.trim() || merchant.unfinishedOrders > 0 && !confirmed)}
              className="h-11 px-6 text-base font-semibold"
            >
              {t('admin.merchants.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default function MerchantRecordDialog({ kind, id, onClose, onSaved }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => adminMerchantApi.detail(id, signal), [id])
  const resource = useCatalogResource(load)
  if (resource.loading || resource.error || !resource.data) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) {
            onClose()
          }
        }}
      >
        <DialogContent closeLabel="common.close">
          <MerchantDialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t('admin.merchants.details')}
            </DialogTitle>
          </MerchantDialogHeader>
          <ResourceFeedback
            {...resource}
            loadingText="admin.loading"
          />
        </DialogContent>
      </Dialog>
    )
  }
  const Component = kind === 'edit' ? MerchantEditor : kind === 'status' ? StatusDialog : Detail
  return (
    <Component
      merchant={resource.data}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
