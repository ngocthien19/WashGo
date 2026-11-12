import ActionConfirmationDialog from '~/components/ActionConfirmationDialog'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shirt, Check, X, Trash2, Power, Store } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import ServiceInfo from '~/pages/merchant/Services/components/ServiceInfo'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminServiceApi } from '~/apis/admin/adminServiceApi'
import { formatDateTime } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { snapshot, proposalSnapshot, unknownWrite, approvalClass } from '../serviceModel'

export default function ServiceRecordDialog({ id, kind, onClose, onSaved, merchants = [] }) {
  const { t } = useTranslation()
  const proposal = kind === 'proposal'
  const actionOnly = ['toggle', 'delete'].includes(kind)
  const load = useCallback(signal => adminServiceApi[proposal ? 'proposal' : 'service'](id, signal), [id, proposal])
  const resource = useCatalogResource(load), value = resource.data
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [action, setAction] = useState(actionOnly ? kind : null), [confirmed, setConfirmed] = useState(false), [reason, setReason] = useState(''), [error, setError] = useState('')
  const locked = useRef(false)
  const run = async () => {
    if (locked.current || blocked || !confirmed || action === 'reject' && !reason.trim()) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const latest = await load()
      const compare = proposal ? proposalSnapshot : snapshot
      if (compare(latest) !== compare(value) || proposal && latest.status !== 1) {
        setBlocked(true); throw new Error('admin.services.changed')
      }
      if (!proposal && action === 'toggle' && latest.approvalStatus !== 2) {
        throw new Error('admin.services.approvedOnly')
      }
      if (!proposal && (action === 'delete' && latest.canDelete === false || action === 'toggle' && latest.canChangeAvailability === false)) {
        throw new Error('admin.services.changed')
      }
      writing = true
      if (proposal) {
        await adminServiceApi.review(id, action === 'approve', reason.trim(), latest.version)
      } else if (action === 'delete') {
        await adminServiceApi.remove(id, latest.version)
      } else {
        await adminServiceApi.status(latest, !latest.isActive)
      }
      notify.success(proposal ? 'admin.services.reviewed' : action === 'delete' ? 'admin.services.deleted' : 'admin.services.statusUpdated'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.services.unknown' : getApiError(failure); setError(message); notify.error(message)
    } finally {
      locked.current = false; setPending(false)
    }
  }
  const actionContent = action && value && (
    <section className={actionOnly ? 'space-y-4 rounded-xl border border-border bg-muted/20 p-4' : 'space-y-4'}>
      {actionOnly && (
        <h2 className="border-b border-border pb-3 text-lg font-semibold">
          {t(`admin.services.${action}`)}
        </h2>
      )}
      {!proposal && (
        <div className="flex items-center gap-3">
          <ResourceThumbnail
            urls={value.imageUrls}
            name={value.name}
          />
          <span className="font-semibold">
            {value.name}
          </span>
        </div>
      )}
      {actionOnly && (
        <p className="text-sm leading-6 text-muted-foreground">
          {t(action === 'delete' ? 'admin.services.deleteHint' : 'admin.services.statusHint')}
        </p>
      )}
      {action === 'reject' && (
        <label className="grid gap-3 text-sm font-medium">
          <span>
            {t('merchant.services.rejectionReason')}
          </span>
          <Input
            aria-label={t('merchant.services.rejectionReason')}
            value={reason}
            onChange={event => setReason(event.target.value)}
            maxLength={1000}
            disabled={pending || blocked}
            placeholder={t('admin.services.rejectPlaceholder')}
            className="h-11 text-base font-normal"
          />
        </label>
      )}
      <label className="flex items-start gap-3 text-base">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={event => setConfirmed(event.target.checked)}
          disabled={pending || blocked}
          className="mt-1 size-5 accent-primary"
        />
        <span>
          {t('admin.services.confirmCheck')}
        </span>
      </label>
    </section>
  )
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !locked.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        ready={!resource.loading}
        className={proposal ? 'max-w-5xl' : actionOnly ? 'max-w-xl' : 'max-w-3xl'}
        closeLabel="common.close"
      >
        <DialogHeader tone={kind === 'delete' ? 'danger' : kind === 'toggle' ? value?.isActive ? 'warning' : 'success' : 'info'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            {kind === 'delete' ? <Trash2 className="text-destructive" /> : kind === 'toggle' ? <Power className="text-amber-600" /> : <Shirt className="text-primary" />}
            {t(actionOnly ? kind === 'delete' ? 'admin.services.delete' : value?.isActive ? 'admin.services.deactivate' : 'admin.services.activate' : proposal ? 'merchant.services.proposalDetails' : 'merchant.services.details')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t(actionOnly ? kind === 'delete' ? 'admin.services.deleteHint' : 'admin.services.statusHint' : proposal ? 'admin.services.reviewHint' : 'admin.services.detailHint')}
          </DialogDescription>
        </DialogHeader>
        {!value ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="flex min-w-0 items-center gap-3">
                {proposal && (
                  <ResourceThumbnail
                    urls={value.merchantImageUrls || merchants.find(merchant => merchant.id === value.merchantId)?.imageUrls || []}
                    name={value.merchantName}
                    icon={Store}
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold">
                    {proposal ? value.merchantName : value.code}
                  </p>
                  {proposal && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(value.createdAt)}
                    </p>
                  )}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${approvalClass(proposal ? value.status : value.approvalStatus)}`}>
                {t(`merchant.services.approval.${proposal ? value.status : value.approvalStatus}`)}
              </span>
            </div>
            {!proposal && value.approvalStatus !== 2 && (
              <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                {t('admin.services.approvedOnly')}
              </p>
            )}
            {proposal ? (
              <>
                <div className={`grid items-start gap-5 ${value.current ? 'lg:grid-cols-2' : ''}`}>
                  {value.current && (
                    <section className="rounded-2xl border border-border p-5">
                      <h2 className="mb-4 border-b border-border pb-3 text-lg font-semibold">
                        {t('merchant.services.before')}
                      </h2>
                      <ServiceInfo value={value.current} />
                    </section>
                  )}
                  <section className="rounded-2xl border border-primary/20 bg-primary/3 p-5">
                    <h2 className="mb-4 border-b border-border pb-3 text-lg font-semibold">
                      {t('merchant.services.proposed')}
                    </h2>
                    <ServiceInfo value={value.proposed} />
                  </section>
                </div>
                {value.reason && (
                  <p className="whitespace-pre-wrap rounded-xl bg-muted/30 p-4 text-base">
                    {t('merchant.services.reason')}
                    :
                    {' '}
                    {value.reason}
                  </p>
                )}
                {value.rejectionReason && (
                  <p className="whitespace-pre-wrap rounded-xl bg-red-500/10 p-4 text-base text-red-700 dark:text-red-300">
                    {t('merchant.services.rejectionReason')}
                    :
                    {' '}
                    {value.rejectionReason}
                  </p>
                )}
                {value.reviewedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t('merchant.services.reviewedAt')}
                    :
                    {' '}
                    {formatDateTime(value.reviewedAt)}
                  </p>
                )}
              </>
            ) : !actionOnly && <ServiceInfo value={value} />}
            {actionOnly && actionContent}
            {error && !proposal && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              >
                {t(error)}
              </p>
            )}
            <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={pending}
                className="h-11 px-5 text-base"
              >
                {t('common.close')}
              </Button>
              {actionOnly && (
                <Button
                  disabled={!confirmed || pending || blocked}
                  onClick={run}
                  variant={action === 'delete' ? 'destructive' : 'default'}
                  className="h-11 px-6 text-base"
                >
                  {action === 'delete' ? <Trash2 size={18} /> : <Power size={18} />}
                  {t(pending ? 'admin.services.saving' : 'admin.services.confirm')}
                </Button>
              )}
              {proposal && value.status === 1 && (
                <>
                  <Button
                    variant="outline"
                    disabled={pending || blocked}
                    onClick={() => {
                      setAction('reject'); setConfirmed(false)
                    }}
                    className="h-11 border-red-500/20 bg-red-500/5 px-5 text-base text-red-700 hover:border-red-600 hover:bg-red-600 hover:text-white dark:text-red-300 dark:hover:border-red-600 dark:hover:bg-red-600 dark:hover:text-white"
                  >
                    <X size={18} />
                    {t('admin.services.reject')}
                  </Button>
                  <Button
                    disabled={pending || blocked}
                    onClick={() => {
                      setAction('approve'); setConfirmed(false)
                    }}
                    className="h-11 bg-emerald-600 px-5 text-base text-white hover:bg-emerald-700"
                  >
                    <Check size={18} />
                    {t('admin.services.approve')}
                  </Button>
                </>
              )}
            </footer>
          </div>
        )}
      </DialogContent>
      {proposal && action && value && (
        <ActionConfirmationDialog
          title={t(`admin.services.${action}`)}
          description={t('admin.services.confirmReviewHint')}
          icon={action === 'reject' ? X : Check}
          tone={action === 'reject' ? 'danger' : 'success'}
          pending={pending}
          disabled={!confirmed || blocked || action === 'reject' && !reason.trim()}
          error={error}
          onClose={() => {
            setAction(null); setConfirmed(false)
          }}
          onConfirm={run}
          confirmLabel={t(pending ? 'admin.services.saving' : 'admin.services.confirm')}
        >
          <p className="rounded-xl border border-primary/15 bg-primary/5 p-4 font-semibold">
            {value.proposed.name}
          </p>
          {actionContent}
        </ActionConfirmationDialog>
      )}
    </Dialog>
  )
}
