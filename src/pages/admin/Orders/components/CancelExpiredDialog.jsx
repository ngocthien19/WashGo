import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { CircleX } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminOrderApi } from '~/apis/admin/adminOrderApi'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'

const schema = yup.object({ reason: yup.string().trim().required('admin.sync.cancelReason').max(500), confirmed: yup.boolean().oneOf([true], 'admin.sync.cancelConfirm') })
export default function CancelExpiredDialog({ id, onClose, onSaved }) {
  const { t } = useTranslation(), lock = useRef(false)
  const load = useCallback(signal => adminOrderApi.cancellationQuote(id, signal), [id])
  const resource = useCatalogResource(load), quote = resource.data
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: { reason: '', confirmed: false } })
  const submit = async values => {
    if (lock.current || blocked || !quote?.canCancel) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      const latest = await load()
      if (!latest.canCancel || latest.revision !== quote.revision || ['feeAmount', 'refundAmount', 'feeOutstanding', 'paidAmount'].some(key => latest[key] !== quote[key])) {
        setBlocked(true); throw new Error('admin.orderManagement.changed')
      }
      await adminOrderApi.cancelExpired(quote, values.reason.trim())
      notify.success('admin.sync.cancelled'); onSaved()
    } catch (failure) {
      if (failure.uncertain || !failure.response || failure.response.status >= 500 || failure.response.status === 409) {
        setBlocked(true)
      }
      setError(getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !lock.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        ready={!resource.loading}
        className="max-w-2xl"
      >
        <DialogHeader tone="danger">
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <CircleX />
            {t('admin.sync.cancelExpired')}
          </DialogTitle>
          <DialogDescription className="mt-4 text-base leading-6 text-muted-foreground">
            {t('admin.sync.cancelHint')}
          </DialogDescription>
        </DialogHeader>
        {!quote ? <ResourceFeedback {...resource} /> : (
          <form
            onSubmit={event => handleSubmit(submit)(event)}
            className="mt-5 space-y-5"
          >
            <p className="rounded-xl border border-border bg-muted/20 p-4">
              {t('admin.sync.depositDeadline')}
              :
              {' '}
              <strong>
                {formatDateTime(quote.depositDeadline)}
              </strong>
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {['paidAmount', 'feeAmount', 'refundAmount', 'feeOutstanding'].map(key => (
                <div
                  key={key}
                  className="rounded-xl border border-border p-4"
                >
                  <dt className="text-sm text-muted-foreground">
                    {t(`admin.sync.${key}`)}
                  </dt>
                  <dd className="mt-2 text-lg font-semibold">
                    {formatCurrency(quote[key])}
                  </dd>
                </div>
              ))}
            </dl>
            {!quote.canCancel && (
              <p className="rounded-xl bg-amber-500/10 p-4">
                {quote.reason || quote.reasonCode}
              </p>
            )}
            <fieldset
              disabled={busy || blocked || !quote.canCancel}
              className="space-y-4"
            >
              <label className="grid gap-2">
                {t('admin.sync.cancelReason')}
                <Input
                  {...register('reason')}
                  maxLength={500}
                  className="h-12 text-base"
                />
                <FormError>
                  {errors.reason?.message}
                </FormError>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  {...register('confirmed')}
                  className="mt-1 size-5"
                />
                {t('admin.sync.cancelConfirm')}
              </label>
              <FormError>
                {errors.confirmed?.message}
              </FormError>
            </fieldset>
            <FormError>
              {error}
            </FormError>
            <footer className="flex justify-end gap-3 border-t border-border pt-5">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={onClose}
                className="h-11 px-5 text-base"
              >
                {t('common.close')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={busy || blocked || !quote.canCancel}
                className="h-11 px-5 text-base"
              >
                {t('admin.sync.cancelExpired')}
              </Button>
            </footer>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
