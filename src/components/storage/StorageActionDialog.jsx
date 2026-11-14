import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import FormError from '~/components/ui/FormError'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { storageApi } from '~/apis/storageApi'
import { getApiError } from '~/utils/apiError'
import { formatDateTime } from '~/utils/formats'
import QrScanInput from '~/components/customer/orders/QrScanInput'

export default function StorageActionDialog({ order, cycle, action, role, taskId, quote, onClose, onSaved }) {
  const { t } = useTranslation()
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
    receiptReference: action === 'handover' ? yup.string().trim().required('storage.required').max(120) : yup.string(),
    pinCode: credential && mode === 'pin' ? yup.string().matches(/^[0-9]{6}$/, 'storage.invalidPin').required('storage.invalidPin') : yup.string(),
    qrCode: credential && mode === 'qr' ? yup.string().trim().required('storage.required').max(500) : yup.string()
  })
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: { confirmed: false, reason: '', shipperId: '', pinCode: '', qrCode: '', receiptReference: '', verificationReference: '' } })
  const shipperId = useWatch({ control, name: 'shipperId' })
  const shippers = useCatalogResource(useCallback(signal => action === 'assign' ? storageApi.shippers(order.id, signal) : Promise.resolve([]), [order.id, action]))
  const execute = async (values, recovery) => {
    if (lock.current || blocked && !recovery) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      if (recovery) {
        await storageApi[recovery](order.id)
      } else {
        if (action === 'return-request' && (!quote || Date.parse(quote.expiresAt) <= Date.now())) {
          throw new Error('storage.quoteExpired')
        }
        const body = { reason: values.reason || undefined }
        if (action === 'assign') {
          body.shipperId = values.shipperId
        }
        if (action === 'verify-legacy') {
          Object.assign(body, { confirmedAtCurrentShop: true, verificationReference: values.verificationReference })
        }
        if (quote) {
          body.quoteToken = quote.quoteToken
        }
        if (credential) {
          Object.assign(body, { taskId, ...(mode === 'pin' ? { pinCode: values.pinCode } : { qrCode: values.qrCode.trim() }), ...(action === 'handover' ? { receiptReference: values.receiptReference } : {}) })
        }
        await storageApi.execute(order.id, action, cycle?.orderRevision ?? order.revision, body)
      }
      setUnknown(false); onSaved()
    } catch (failure) {
      const metadata = failure.response?.data?.meta || {}
      setAttempts({ remaining: metadata.remainingAttempts, until: metadata.lockoutUntil })
      const pending = storageApi.hasPending(order.id)
      setUnknown(pending)
      setError(pending ? 'storage.unknown' : role === 'Customer' ? 'storage.customerError' : getApiError(failure))
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t(`storage.actions.${action}`)}
          </DialogTitle>
          <DialogDescription className="mt-3">
            {t(credential ? 'storage.simulation' : action === 'verify-legacy' ? 'storage.legacyProof' : 'storage.confirmHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 space-y-4"
          onSubmit={event => handleSubmit(values => execute(values))(event)}
        >
          <FormError>
            {error}
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
            disabled={busy || unknown || blocked}
            className="space-y-4"
          >
            {action === 'assign' && (
              <>
                {shippers.loading || shippers.error ? <ResourceFeedback {...shippers} /> : (
                  <SelectField
                    value={shipperId}
                    label={t('storage.shipper')}
                    options={[{ value: '', label: t('storage.chooseShipper') }, ...(shippers.data || []).map(row => ({ value: row.id, label: `${row.fullName} · ${row.phone || row.email || '—'}` }))]}
                    onValueChange={value => setValue('shipperId', value, { shouldValidate: true })}
                  />
                )}
              </>
            )}
            {(role === 'Admin' || action === 'exception') && (
              <label className="grid gap-2">
                {t('storage.reason')}
                <textarea
                  className="min-h-24 rounded-xl border border-input bg-background p-3"
                  maxLength={500}
                  {...register('reason')}
                />
              </label>
            )}
            {['handover', 'verify-legacy'].includes(action) && (
              <label className="grid gap-2">
                {t(action === 'handover' ? 'storage.receipt' : 'storage.proof')}
                <Input
                  maxLength={120}
                  {...register(action === 'handover' ? 'receiptReference' : 'verificationReference')}
                />
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
              </>
            )}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5"
                {...register('confirmed')}
              />
              <span>
                {t('storage.confirmed')}
              </span>
            </label>
            {Object.values(errors).map((error, index) => (
              <FormError key={index}>
                {error.message}
              </FormError>
            ))}
          </fieldset>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-5"
              disabled={busy}
              onClick={onClose}
            >
              {t(blocked ? 'storage.reload' : 'common.close')}
            </Button>
            {unknown ? (
              <>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => execute(null, 'check')}
                >
                  {t('admin.sync.checkResult')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => execute(null, 'replay')}
                >
                  {t('storage.replay')}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                className="h-11 px-5"
                disabled={busy || blocked || action === 'assign' && (shippers.loading || shippers.error)}
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
