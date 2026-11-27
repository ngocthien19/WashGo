import { useOrderChangedSinceOpen } from '~/hooks/useOrderRealtime'
import ShipperSelection from '~/components/shippers/ShipperSelection'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { canAssignShipper, isShipperCapacityConflict } from '~/utils/orders/shipperCapacity'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import FormError from '~/components/ui/FormError'
import { notify } from '~/utils/notifications/notifications'
import useCatalogResource from '~/hooks/useCatalogResource'
import { storageApi } from '~/apis/storage/storageApi'
import { getApiError } from '~/utils/http/apiError'
import { formatDateTime } from '~/utils/format/formats'
import QrScanInput from '~/components/customer/orders/QrScanInput'

export default function StorageActionDialog({ order, cycle, action, role, taskId, quote, onClose, onSaved }) {
  const { t } = useTranslation()
  const liveStale = useOrderChangedSinceOpen(order.id)
  const credential = ['collect', 'handover', 'depart', 'place'].includes(action)
  const [mode, setMode] = useState('pin')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false)
  const [unknown, setUnknown] = useState(storageApi.hasPending(order.id))
  const [attempts, setAttempts] = useState(null)
  const lock = useRef(false)
  const schema = yup.object({
    confirmed: yup.boolean().oneOf([true], 'storage.confirmRequired'),
    shipperId: action === 'assign' ? yup.string().required('storage.required') : yup.string(),
    reason: role === 'Admin' || action === 'exception' ? yup.string().trim().required('storage.required').max(500) : yup.string().trim().max(500),
    verificationReference: action === 'verify-legacy' ? yup.string().trim().required('storage.required').max(120) : yup.string(),
    receiptReference: action === 'handover' ? yup.string().trim().max(120) : yup.string(),
    pinCode: credential && mode === 'pin' ? yup.string().matches(/^[0-9]{6}$/, 'storage.invalidPin').required('storage.invalidPin') : yup.string(),
    qrCode: credential && mode === 'qr' ? yup.string().trim().required('storage.required').max(500) : yup.string()
  })
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: { confirmed: false, reason: '', shipperId: '', pinCode: '', qrCode: '', receiptReference: '', verificationReference: '' } })
  const shipperId = useWatch({ control, name: 'shipperId' })
  const shippers = useCatalogResource(useCallback(signal => action === 'assign' ? storageApi.shippers(order.id, signal) : Promise.resolve([]), [order.id, action]))
  const execute = async (values, recovery) => {
    if (lock.current || (blocked || liveStale) && !recovery) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      if (recovery) {
        await storageApi[recovery](order.id)
      } else {
        if (action === 'return-request' && (!quote || role !== 'Customer' && Date.parse(quote.expiresAt) <= Date.now())) {
          throw new Error('storage.quoteExpired')
        }
        const body = { reason: values.reason || undefined }
        if (action === 'return-request' && role === 'Customer') {
          const latest = await customerPaymentApi.getOrder(order.id)
          const summary = await customerPaymentApi.getSummary(order.id)
          const lockerId = summary.returnLockerId
          if (!summary.canRequestStorageReturn || latest.status !== 13 || !lockerId || quote.lockerId !== lockerId || latest.revision !== (cycle?.orderRevision ?? order.revision)) {
            throw new Error('storageCustomer.paymentFirst')
          }
          const freshQuote = await storageApi.quote(order.id, lockerId)
          if (freshQuote.outstanding !== 0) {
            throw new Error('storageCustomer.paymentFirst')
          }
          body.quoteToken = freshQuote.quoteToken
        }
        if (action === 'assign') {
          const candidates = await storageApi.shippers(order.id)
          if (!candidates.some(row => row.id === values.shipperId && canAssignShipper(row))) {
            setValue('shipperId', ''); shippers.retry(); setError('shipperCapacity.changed'); return
          }
          body.shipperId = values.shipperId
        }
        if (action === 'verify-legacy') {
          Object.assign(body, { confirmedAtCurrentShop: true, verificationReference: values.verificationReference })
        }
        if (quote && !body.quoteToken) {
          body.quoteToken = quote.quoteToken
        }
        if (credential) {
          Object.assign(body, { taskId, ...(mode === 'pin' ? { pinCode: values.pinCode } : { qrCode: values.qrCode.trim() }), ...(action === 'handover' ? { receiptReference: values.receiptReference || undefined } : {}) })
        }
        await storageApi.execute(order.id, action, cycle?.orderRevision ?? order.revision, body)
      }
      notify.success('forms.saved'); setUnknown(false); onSaved()
    } catch (failure) {
      if (action === 'assign' && isShipperCapacityConflict(failure)) {
        setValue('shipperId', ''); shippers.retry(); setError('shipperCapacity.changed'); return
      }
      const metadata = failure.response?.data?.meta || {}
      setAttempts({ remaining: metadata.remainingAttempts, until: metadata.lockoutUntil })
      const pending = storageApi.hasPending(order.id)
      setUnknown(pending)
      setError(pending ? 'storage.unknown' : failure.message === 'storageCustomer.paymentFirst' ? failure.message : role === 'Customer' ? 'storage.customerError' : getApiError(failure))
      if (!pending) {
        setBlocked(true)
      }
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={open => !open && !lock.current && onClose()}
    >
      <DialogContent
        className="max-w-xl"
        data-dialog-fixed
      >
        <DialogHeader tone={action === 'exception' ? 'danger' : 'info'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            {action === 'exception' && <ShieldAlert aria-hidden="true" />}
            {t(`storage.actions.${action}`)}
          </DialogTitle>
          <DialogDescription className="mt-3">
            {t(credential ? 'storage.simulation' : action === 'verify-legacy' ? 'storage.legacyProof' : 'storage.confirmHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="mt-5 space-y-4"
          onSubmit={event => handleSubmit(values => execute(values))(event)}
          data-dialog-layout
        >
          <div data-dialog-body>
            <FormError>
              {liveStale && !unknown ? 'orderLive.changed' : error}
            </FormError>
            {Number.isInteger(attempts?.remaining) && (
              <p className="text-sm text-destructive">
                {t('storage.remainingAttempts', { count: attempts.remaining })}
              </p>
            )}
            {attempts?.until && (
              <p className="text-sm text-destructive">
                {t('storage.lockoutUntil', { time: formatDateTime(attempts.until) })}
              </p>
            )}
            {unknown && (
              <p className="rounded-xl bg-amber-500/10 p-4">
                {t('storage.unknown')}
              </p>
            )}
            <fieldset
              disabled={busy || unknown || blocked || liveStale}
              className="space-y-4"
            >
              {action === 'assign' && (
                <>
                  <ShipperSelection
                    resource={shippers}
                    value={shipperId}
                    disabled={busy || unknown || blocked || liveStale}
                    onChange={row => {
                      setValue('shipperId', row?.id || '', { shouldValidate: true }); setValue('confirmed', false)
                    }}
                  />
                  <FormError
                    inline
                    id="storage-shipper-error"
                  >
                    {errors.shipperId?.message}
                  </FormError>
                </>
              )}
              {(role === 'Admin' || action === 'exception') && (
                <label className="grid gap-2">
                  {t('storage.reason')}
                  <textarea
                    aria-label={t('storage.reason')}
                    aria-invalid={!!errors['reason']}
                    aria-describedby={errors.reason ? 'storage-reason-error' : undefined}
                    className="min-h-24 rounded-xl border border-input bg-background p-3"
                    maxLength={500}
                    {...register('reason')}
                  />
                  <FormError
                    inline
                    id="storage-reason-error"
                  >
                    {errors.reason?.message}
                  </FormError>
                </label>
              )}
              {['handover', 'verify-legacy'].includes(action) && (
                <label className="grid gap-2">
                  {t(action === 'handover' ? 'storage.receiptOptional' : 'storage.proof')}
                  <Input
                    aria-label={t(action === 'handover' ? 'storage.receiptOptional' : 'storage.proof')}
                    aria-invalid={!!errors[action === 'handover' ? 'receiptReference' : 'verificationReference']}
                    aria-describedby={errors[action === 'handover' ? 'receiptReference' : 'verificationReference'] ? 'storage-reference-error' : undefined}
                    maxLength={120}
                    {...register(action === 'handover' ? 'receiptReference' : 'verificationReference')}
                  />
                  <FormError
                    inline
                    id="storage-reference-error"
                  >
                    {errors[action === 'handover' ? 'receiptReference' : 'verificationReference']?.message}
                  </FormError>
                </label>
              )}
              {credential && (
                <>
                  <SelectField
                    label={t('storage.credential')}
                    value={mode}
                    options={[{ value: 'pin', label: 'PIN' }, { value: 'qr', label: 'QR' }]}
                    onValueChange={value => {
                      setMode(value); setValue('pinCode', ''); setValue('qrCode', '')
                    }}
                  />
                  {mode === 'pin' ? (
                    <Input
                      aria-invalid={!!errors['pinCode']}
                      aria-describedby={errors.pinCode ? 'storage-credential-error' : undefined}
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={6}
                      aria-label="PIN"
                      {...register('pinCode')}
                    />
                  ) : (
                    <>
                      <Input
                        aria-invalid={!!errors['qrCode']}
                        aria-describedby={errors.qrCode ? 'storage-credential-error' : undefined}
                        aria-label="QR"
                        autoComplete="off"
                        maxLength={500}
                        {...register('qrCode')}
                      />
                      <QrScanInput
                        onCode={code => setValue('qrCode', code, { shouldValidate: true })}
                        onClear={() => setValue('qrCode', '')}
                      />
                    </>
                  )}
                  <FormError
                    inline
                    id="storage-credential-error"
                  >
                    {errors[mode === 'pin' ? 'pinCode' : 'qrCode']?.message}
                  </FormError>
                </>
              )}
              <label className="flex items-start gap-3">
                <input
                  aria-invalid={!!errors['confirmed']}
                  aria-describedby={errors.confirmed ? 'storage-confirmed-error' : undefined}
                  type="checkbox"
                  className="mt-1 size-5"
                  {...register('confirmed')}
                />
                <span>
                  {t('storage.confirmed')}
                </span>
              </label>
              <FormError
                inline
                id="storage-confirmed-error"
              >
                {errors.confirmed?.message}
              </FormError>
            </fieldset>
          </div>
          <footer
            className="flex flex-wrap justify-end gap-3 border-t border-border pt-4"
            data-dialog-footer
          >
            <Button
              type="button"
              variant="secondary"
              className="h-12 rounded-xl px-5 text-base"
              disabled={busy}
              onClick={onClose}
            >
              {t(blocked || liveStale ? 'storage.reload' : 'common.close')}
            </Button>
            {unknown ? (
              <>
                <Button
                  type="button"
                  className="h-12 rounded-xl px-5 text-base"
                  variant={action === 'exception' ? 'destructive' : 'default'}
                  disabled={busy}
                  onClick={() => execute(null, 'check')}
                >
                  {t('admin.sync.checkResult')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl px-5 text-base"
                  disabled={busy}
                  onClick={() => execute(null, 'replay')}
                >
                  {t('storage.replay')}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                className="h-12 min-w-40 rounded-xl px-5 text-base"
                variant={action === 'exception' ? 'destructive' : 'default'}
                disabled={busy || blocked || liveStale || action === 'assign' && (shippers.loading || shippers.error)}
              >
                {t(`storage.actions.${action}`)}
              </Button>
            )}
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
