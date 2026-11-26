import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import { useOrderChangedSinceOpen } from '~/hooks/useOrderRealtime'
import { orderManagementApi as api } from '~/apis/orders/orderManagementApi'
import { actualsSchema, actualsInput, actualsErrorCodes, countLines, hasWeight } from '~/utils/orders/orderActuals'
import { sameOrderState } from '~/utils/orders/orderManagement'
import { formatCurrency } from '~/utils/format/formats'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'

export default function OrderActualsDialog({ order: currentOrder, onClose, onSaved }) {
  const { t } = useTranslation()
  const [order] = useState(currentOrder)
  const liveStale = useOrderChangedSinceOpen(order.id)
  const [blocked, setBlocked] = useState(false)
  const stale = blocked || liveStale || currentOrder.revision !== order.revision
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [remembered] = useState(() => api.pendingActuals(order.id))
  const [unknown, setUnknown] = useState(!!remembered)
  const [canRetry, setCanRetry] = useState(false)
  const request = useRef(remembered)
  const lock = useRef(false)
  const lines = countLines(order)
  const { register, control, handleSubmit, setError: setFieldError, formState: { errors } } = useForm({
    resolver: yupResolver(actualsSchema(order)),
    defaultValues: { actualWeightKg: remembered?.body.actualWeightKg != null ? String(remembered.body.actualWeightKg) : order.actualWeightKg == null ? '' : String(order.actualWeightKg),
      items: lines.map(item => ({ orderItemId: item.id, actualQuantity: remembered?.body.items.find(line => line.orderItemId === item.id)?.actualQuantity ?? item.actualQuantity ?? item.quantity })), note: remembered?.body.note || '' }
  })
  const values = useWatch({ control })
  const fingerprint = JSON.stringify(actualsInput(values, order))
  const preview = quote?.fingerprint === fingerprint ? quote.data : null
  const complete = () => {
    notify.success('actuals.saved'); onSaved()
  }
  const failureMessage = failure => {
    const meta = failure.response?.data?.meta
    const message = actualsErrorCodes.has(meta?.code) ? `actuals.errors.${meta.code}` : getApiError(failure)
    const index = lines.findIndex(item => item.id === meta?.orderItemId)
    if (index >= 0) {
      setFieldError(`items.${index}.actualQuantity`, { type: 'server', message })
    }
    return message
  }
  const fresh = async () => {
    const latest = await api.detail(order.id)
    if (!sameOrderState(order, latest) || latest.allowedActions?.canConfirmActuals !== true) {
      setBlocked(true); setError('orderLive.changed'); return false
    }
    return true
  }
  const previewPrice = async form => {
    if (lock.current || stale || unknown) {
      return
    }
    lock.current = true; setPending(true); setError(''); setQuote(null); setConfirmation(null)
    try {
      if (!await fresh()) {
        return
      }
      const body = actualsInput(form, order)
      const result = await api.previewActuals(order.id, body)
      if (result.revision !== order.revision || result.status !== order.status) {
        setBlocked(true); setError('orderLive.changed'); return
      }
      setQuote({ fingerprint: JSON.stringify(body), data: result })
    } catch (failure) {
      setError(failureMessage(failure))
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const send = async saved => {
    try {
      await api.confirmActuals(order.id, saved.body, saved.guard)
      complete()
    } catch (failure) {
      const uncertain = failure.uncertain || !failure.response || failure.response.status >= 500 || failure.response.status === 408
      setUnknown(uncertain); setCanRetry(false)
      if (failure.response?.status === 409) {
        setBlocked(true)
      }
      if (!uncertain) {
        request.current = null; setQuote(null)
      }
      setError(uncertain ? 'actuals.uncertain' : failure.response?.status === 409 ? 'orderLive.changed' : failureMessage(failure))
    }
  }
  const confirm = async form => {
    if (lock.current || stale || unknown || !preview || confirmation !== fingerprint) {
      return
    }
    lock.current = true; setPending(true); setError('')
    try {
      if (!await fresh()) {
        return
      }
      request.current = { body: { ...actualsInput(form, order), expectedFinalAmount: preview.finalAmount },
        guard: { expectedRevision: preview.revision, expectedStatus: preview.status, operationId: crypto.randomUUID() } }
      await send(request.current)
    } catch (failure) {
      setError(failureMessage(failure))
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const recover = async retry => {
    if (lock.current || !request.current) {
      return
    }
    lock.current = true; setPending(true); setError('')
    try {
      if (retry) {
        await send(request.current)
      } else if (await api.resolveActuals(order.id)) {
        complete()
      } else {
        setCanRetry(true); setError('merchant.orderSync.notRecorded')
      }
    } catch {
      setError('merchant.orderSync.lookupFailed')
    } finally {
      lock.current = false; setPending(false)
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
        className="max-w-2xl border-primary/15"
        data-dialog-fixed
        closeLabel="common.close"
      >
        <div data-dialog-header>
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <ClipboardCheck className="size-6 shrink-0 text-primary" />
            {t('actuals.title')}
          </DialogTitle>
          <DialogDescription className="mt-2 text-base">
            <span className="font-semibold text-primary">
              {order.orderCode}
            </span>
            {' '}
            ·
            {' '}
            {t('actuals.description')}
          </DialogDescription>
        </div>
        <form
          noValidate
          onSubmit={event => handleSubmit(previewPrice)(event)}
          data-dialog-layout
        >
          <div
            className="space-y-5"
            data-dialog-body
          >
            <fieldset
              disabled={pending || unknown || stale}
              className="space-y-4"
            >
              {lines.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <p className="font-semibold">
                    {item.serviceName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('actuals.ordered')}
                    :
                    {' '}
                    {item.quantity}
                    {' '}
                    {t(`actuals.units.${item.unitSnapshot || 'unknown'}`)}
                  </p>
                  <input
                    type="hidden"
                    {...register(`items.${index}.orderItemId`)}
                  />
                  <label className="mt-3 grid gap-2 text-base font-medium">
                    <span>
                      {t('actuals.actual')}
                      {' '}
                      (
                      {t(`actuals.units.${item.unitSnapshot || 'unknown'}`)}
                      )
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      className="h-12 text-base"
                      aria-invalid={!!errors.items?.[index]?.actualQuantity}
                      aria-describedby={`actuals-line-${index}`}
                      {...register(`items.${index}.actualQuantity`)}
                    />
                  </label>
                  <FormError
                    inline
                    id={`actuals-line-${index}`}
                  >
                    {errors.items?.[index]?.actualQuantity?.message}
                  </FormError>
                  {preview && (
                    <p className="mt-2 font-semibold text-primary">
                      {formatCurrency(preview.items.find(line => line.orderItemId === item.id)?.amount)}
                    </p>
                  )}
                </div>
              ))}
              {hasWeight(order) && (
                <label className="grid gap-2 text-base font-medium">
                  <span>
                    {t('actuals.weight')}
                  </span>
                  <Input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    className="h-12 text-base"
                    aria-invalid={!!errors.actualWeightKg}
                    aria-describedby="actuals-weight-error"
                    {...register('actualWeightKg')}
                  />
                  <FormError
                    inline
                    id="actuals-weight-error"
                  >
                    {errors.actualWeightKg?.message}
                  </FormError>
                </label>
              )}
              <label className="grid gap-2 text-base font-medium">
                <span>
                  {t('actuals.note')}
                </span>
                <textarea
                  rows={3}
                  maxLength={500}
                  aria-invalid={!!errors.note}
                  aria-describedby="actuals-note-error"
                  className="w-full rounded-xl border border-input bg-background p-3 text-base focus-visible:outline-primary"
                  {...register('note')}
                />
                <FormError
                  inline
                  id="actuals-note-error"
                >
                  {errors.note?.message}
                </FormError>
              </label>
            </fieldset>
            {preview && (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                {preview.promotionRemoved && (
                  <p
                    role="status"
                    className="text-sm font-medium text-amber-700 dark:text-amber-300"
                  >
                    {t('actuals.promotionRemoved')}
                  </p>
                )}
                <dl className="space-y-2 text-sm">
                  {[['previousFinalAmount', 'previous'], ['totalAmount', 'subtotal'], ['weightSurchargeAmount', 'surcharge'], ['discountAmount', 'discount'], ['finalAmount', 'total']].map(([key, label]) => (
                    <div
                      key={key}
                      className={`flex justify-between gap-4 ${key === 'finalAmount' ? 'border-t border-primary/20 pt-3 font-bold text-primary' : ''}`}
                    >
                      <dt>
                        {t(`actuals.${label}`)}
                      </dt>
                      <dd className="whitespace-nowrap font-semibold tabular-nums">
                        {formatCurrency(preview[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
                <label className="flex items-start gap-3 text-base">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    disabled={pending || unknown || stale}
                    checked={confirmation === fingerprint}
                    onChange={event => setConfirmation(event.target.checked ? fingerprint : null)}
                  />
                  <span>
                    {t('actuals.confirmation')}
                  </span>
                </label>
              </div>
            )}
            {unknown && (
              <p
                className="rounded-xl bg-amber-500/10 p-4 text-sm"
                role="status"
              >
                {t('actuals.uncertain')}
              </p>
            )}
            <FormError>
              {stale && !unknown ? 'orderLive.changed' : error}
            </FormError>
          </div>
          <div
            data-dialog-footer
            className="flex flex-wrap justify-end gap-3 border-t border-border pt-4"
          >
            <Button
              type="button"
              variant="secondary"
              className="h-12 px-5 text-base"
              disabled={pending}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            {unknown ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-5 text-base"
                  disabled={pending}
                  onClick={() => recover(false)}
                >
                  {t('merchant.orderSync.checkResult')}
                </Button>
                {canRetry && (
                  <Button
                    type="button"
                    className="h-12 px-5 text-base"
                    disabled={pending}
                    onClick={() => recover(true)}
                  >
                    {t('merchant.orderSync.retrySame')}
                  </Button>
                )}
              </>
            ) : stale ? (
              <Button
                type="button"
                className="h-12 px-5 text-base"
                disabled={pending}
                onClick={onSaved}
              >
                {t('orderLive.review')}
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  variant="outline-primary"
                  className="h-12 px-5 text-base"
                  disabled={pending}
                >
                  {t('actuals.preview')}
                </Button>
                <Button
                  type="button"
                  className="h-12 px-5 text-base"
                  disabled={pending || !preview || confirmation !== fingerprint}
                  onClick={event => handleSubmit(confirm)(event)}
                >
                  {t(pending ? 'merchant.orders.saving' : 'actuals.confirm')}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
