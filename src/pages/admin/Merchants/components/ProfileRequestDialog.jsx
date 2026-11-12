import { privateDocumentApi } from '~/apis/privateDocumentApi'
import PrivateDocumentCard from '~/components/documents/PrivateDocumentCard'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, FileCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceGallery from '~/components/ResourceThumbnail/ResourceGallery'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminMerchantApi } from '~/apis/admin/adminMerchantApi'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { displayJsonText, requestSnapshot, profileStillCurrent, unknownWrite } from '../merchantModel'
import MerchantDialogHeader from './MerchantDialogHeader'

export default function ProfileRequestDialog({ id, onClose, onSaved }) {
  const { t } = useTranslation()
  const load = useCallback(async signal => {
    const request = await adminMerchantApi.request(id, signal)
    const ids = [...new Set([request.current.businessLicenseDocumentId, request.proposed.businessLicenseDocumentId].filter(Boolean))]
    const values = await Promise.allSettled(ids.map(fileId => privateDocumentApi.read(fileId, signal)))
    return { ...request, documentMetadata: Object.fromEntries(values.flatMap((value, index) => value.status === 'fulfilled' ? [[ids[index], value.value]] : [])) }
  }, [id])
  const resource = useCatalogResource(load)
  const value = resource.data
  const [reason, setReason] = useState(''), [rejecting, setRejecting] = useState(false), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const review = async (approve) => {
    if (lock.current || blocked || !value || value.status !== 1 || !approve && (!reason.trim() || reason.trim().length > 1000)) {
      return
    }
    lock.current = true; setPending(true); setError('')
    let writing = false
    try {
      const latest = await adminMerchantApi.request(id)
      if (requestSnapshot(latest) !== requestSnapshot(value) || latest.status !== 1) {
        setError('admin.merchants.changed'); setBlocked(true); return
      }
      if (approve && !profileStillCurrent(value.current, await adminMerchantApi.detail(value.merchantId))) {
        setError('admin.merchants.profileConflict'); setBlocked(true); return
      }
      writing = true
      await adminMerchantApi.review(id, approve, reason.trim(), value.version)
      notify.success(approve ? 'admin.merchants.approved' : 'admin.merchants.rejected'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      setBlocked(unknown || failure.response?.status === 409)
      const message = unknown ? 'admin.merchants.uncertain' : getApiError(failure)
      setError(message); notify.error(message)
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const keys = ['businessName', 'address', 'city', 'phone', 'openingHours', 'latitude', 'longitude', 'taxCode']
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
        className="max-w-4xl"
      >
        <MerchantDialogHeader tone={rejecting ? 'danger' : 'info'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <FileCheck className="text-primary" />
            {t('admin.merchants.requestDetails')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6">
            {value?.merchantName || t('admin.loading')}
          </DialogDescription>
        </MerchantDialogHeader>
        {resource.loading || resource.error || !value ? (
          <ResourceFeedback
            {...resource}
            loadingText="admin.loading"
          />
        ) : (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm font-semibold">
              {t(`admin.merchants.requestStates.${value.status}`)}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {['field', 'before', 'proposed'].map((key) => (
                      <th
                        key={key}
                        className="p-3 font-semibold"
                      >
                        {t(`admin.merchants.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((key) => (
                    <tr
                      key={key}
                      className={value.changedFields.some((field) => field.toLowerCase() === key.toLowerCase()) ? 'bg-primary/5' : ''}
                    >
                      <th className="p-3 font-semibold">
                        {t(`admin.merchants.fields.${key}`)}
                      </th>
                      <td className="max-w-64 whitespace-pre-wrap break-words p-3 text-muted-foreground">
                        {key === 'openingHours' ? displayJsonText(value.current[key]) || '—' : String(value.current[key] ?? '—')}
                      </td>
                      <td className="max-w-64 whitespace-pre-wrap break-words p-3 font-semibold">
                        {key === 'openingHours' ? displayJsonText(value.proposed[key]) || '—' : String(value.proposed[key] ?? '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <section>
                <h3 className="mb-2 text-sm font-bold">
                  {t('admin.merchants.before')}
                </h3>
                <ResourceGallery
                  urls={value.current.imageUrls || []}
                  name={value.merchantName}
                  thumbnails
                />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold">
                  {t('admin.merchants.proposed')}
                </h3>
                <ResourceGallery
                  urls={value.proposed.imageUrls || []}
                  name={value.merchantName}
                  thumbnails
                />
              </section>
            </div>
            {(value.current.documentsSnapshotIncluded || value.proposed.documentsSnapshotIncluded) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {['current', 'proposed'].map(key => (
                  <section
                    key={key}
                    className="space-y-3"
                  >
                    <h3 className="font-semibold">
                      {t(key === 'current' ? 'admin.merchants.before' : 'admin.merchants.proposed')}
                    </h3>
                    {value.documentMetadata?.[value[key].businessLicenseDocumentId] ? (
                      <PrivateDocumentCard
                        document={value.documentMetadata[value[key].businessLicenseDocumentId]}
                        label={t('merchant.backendSync.businessLicense')}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('merchant.backendSync.noDocument')}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            )}
            {value.rejectionReason && (
              <p className="rounded-xl bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {value.rejectionReason}
              </p>
            )}
            {value.status === 1 && rejecting && (
              <label className="flex flex-col gap-3 text-sm font-semibold">
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
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
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
                    disabled={pending || blocked}
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
