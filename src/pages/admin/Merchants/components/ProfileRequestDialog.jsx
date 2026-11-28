import ProfileRequestDetails from '~/components/merchant-profile/ProfileRequestDetails'
import ProfileRequestStatus from '~/components/merchant-profile/ProfileRequestStatus'
import CoverageBlockedNotice from '~/components/orders/CoverageBlockedNotice'
import { privateDocumentApi } from '~/apis/files/privateDocumentApi'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, FileCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'

import useCatalogResource from '~/hooks/useCatalogResource'
import { adminMerchantApi } from '~/apis/admin/adminMerchantApi'
import { notify } from '~/utils/notifications/notifications'
import { getApiError } from '~/utils/http/apiError'
import { requestSnapshot, profileStillCurrent, unknownWrite } from '../merchantModel'
import MerchantDialogHeader from './MerchantDialogHeader'

export default function ProfileRequestDialog({ id, onClose, onSaved }) {
  const { t } = useTranslation()
  const [excluded, setExcluded] = useState([])
  const load = useCallback(async signal => {
    const request = await adminMerchantApi.request(id, signal)
    const ids = [...new Set([request.current.businessLicenseDocumentId, request.proposed.businessLicenseDocumentId].filter(Boolean))]
    const values = await Promise.allSettled(ids.map(fileId => privateDocumentApi.read(fileId, signal)))
    return { ...request, documentMetadata: Object.fromEntries(values.flatMap((value, index) => value.status === 'fulfilled' ? [[ids[index], value.value]] : [])) }
  }, [id])
  const resource = useCatalogResource(load)
  const value = resource.data
  const [reason, setReason] = useState(''), [rejecting, setRejecting] = useState(false), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [approvalBlocked, setApprovalBlocked] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const review = async (approve) => {
    if (lock.current || blocked || approve && approvalBlocked || !value || value.status !== 1 || !approve && (!reason.trim() || reason.trim().length > 1000)) {
      return
    }
    lock.current = true; setPending(true); setError(''); setExcluded([])
    let writing = false
    try {
      const latest = await adminMerchantApi.request(id)
      if (requestSnapshot(latest) !== requestSnapshot(value) || latest.status !== 1) {
        setError('admin.merchants.changed'); setBlocked(true); return
      }
      if (approve && !profileStillCurrent(value.current, await adminMerchantApi.detail(value.merchantId))) {
        setError('admin.merchants.profileConflict'); setApprovalBlocked(true); return
      }
      writing = true
      await adminMerchantApi.review(id, approve, reason.trim(), value.version)
      notify.success(approve ? 'admin.merchants.approved' : 'admin.merchants.rejected'); onSaved()
    } catch (failure) {
      setExcluded(failure.response?.data?.meta?.lockers || [])
      const unknown = writing && unknownWrite(failure)
      const profileConflict = failure.response?.data?.meta?.code === 'MerchantProfileChanged'
      setBlocked(unknown || failure.response?.status === 409 && !profileConflict)
      if (profileConflict) {
        setApprovalBlocked(true)
      }
      const message = unknown ? 'admin.merchants.uncertain' : getApiError(failure)
      setError(message); notify.error(message)
    } finally {
      lock.current = false; setPending(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        ready={!resource.loading}
        className="max-w-5xl"
        data-dialog-fixed
      >
        <MerchantDialogHeader tone={rejecting ? 'danger' : 'info'}>
          <DialogTitle className="flex items-center gap-3 pr-4 text-xl font-bold sm:text-2xl">
            <FileCheck className="text-primary" />
            {t('admin.merchants.requestDetails')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-6 text-muted-foreground">
            {value?.merchantName || ''}
          </DialogDescription>
        </MerchantDialogHeader>
        {resource.loading || resource.error || !value ? (
          <div data-dialog-body>
            <CoverageBlockedNotice lockers={excluded} />
            <ResourceFeedback
              {...resource}
              loadingText="admin.loading"
            />
          </div>
        ) : (
          <div
            className="mt-5 space-y-5"
            data-dialog-layout
          >
            <div data-dialog-body>
              <ProfileRequestStatus status={value.status} />
              <ProfileRequestDetails value={value} />
              {value.status === 1 && rejecting && (
                <label className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-base font-semibold dark:border-rose-400/20 dark:bg-rose-400/5">
                  <span>
                    {t('admin.merchants.reason')}
                    {' '}
                    <span className="text-destructive">*</span>
                  </span>
                  <textarea
                    maxLength={1000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={pending || blocked}
                    className="min-h-28 rounded-xl border border-input bg-background p-3 text-base"
                  />
                </label>
              )}
              {error && (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {t(error)}
                </p>
              )}
            </div>
            <div
              className="flex flex-wrap justify-end gap-3 border-t border-border pt-5"
              data-dialog-footer
            >
              <Button
                variant="secondary"
                className="h-11 px-5 text-base font-semibold"
                disabled={pending}
                onClick={onClose}
              >
                {t('common.close')}
              </Button>
              {value.status === 1 && (
                <>
                  <Button
                    variant="destructive"
                    className="h-11 px-5 text-base font-semibold"
                    disabled={pending || blocked || rejecting && !reason.trim()}
                    onClick={() => rejecting ? review(false) : setRejecting(true)}
                  >
                    <X size={17} />
                    {t(rejecting ? 'admin.merchants.confirmReject' : 'admin.merchants.reject')}
                  </Button>
                  <Button
                    className="h-11 px-5 text-base font-semibold"
                    disabled={pending || blocked || approvalBlocked}
                    onClick={() => review(true)}
                  >
                    <Check size={17} />
                    {t('admin.merchants.approve')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
