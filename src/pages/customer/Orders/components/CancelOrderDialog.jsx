import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import { getApiError } from '~/utils/apiError'
import { formatCurrency } from '~/utils/formats'
import { ORDER_LIST } from '~/utils/constants'

const schema = yup.object({ reason: yup.string().trim().required('customer.orders.cancel.reasonRequired').max(ORDER_LIST.REASON_MAX, 'customer.orders.cancel.reasonTooLong') })

export default function CancelOrderDialog({ orderId, onClose, onCancelled }) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const pending = useRef(false)
  const load = useCallback((signal) => customerOrderApi.cancellationQuote(orderId, signal), [orderId])
  const quote = useCatalogResource(load)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema), defaultValues: { reason: '' } })
  const cancel = (event) => handleSubmit(async ({ reason }) => {
    if (pending.current || !quote.data?.canCancel || unknown) {
      return
    }
    pending.current = true
    setError('')
    try {
      await customerOrderApi.cancel(orderId, reason)
      onCancelled()
    } catch (failure) {
      const status = failure.response?.status
      const uncertain = !status || status >= 500
      setUnknown(uncertain)
      setError(uncertain ? 'customer.orders.cancel.unknownOutcome' : getApiError(failure))
      pending.current = uncertain
    }
  })(event)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="p-0 sm:p-0"
      >
        <div className="border-b border-border bg-red-500/5 p-6 pr-14">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <AlertTriangle className="text-red-600 dark:text-red-400" />
            {t('customer.orders.cancel.title')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {t('customer.orders.cancel.note')}
          </DialogDescription>
        </div>
        <form
          onSubmit={cancel}
          noValidate
          className="space-y-5 p-6"
        >
          {quote.loading || quote.error ? (
            <CatalogFeedback
              {...quote}
              loadingText="customer.orders.cancel.loading"
            />
          ) : (
            <>
              <dl className="space-y-3 rounded-xl bg-muted/40 p-4 text-sm">
                {[
                  ['fee', quote.data.feeAmount], ['refund', quote.data.refundAmount], ['outstanding', quote.data.feeOutstanding]
                ].map(([label, amount]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt className="text-muted-foreground">
                      {t(`customer.orders.cancel.${label}`)}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatCurrency(amount)}
                    </dd>
                  </div>
                ))}
              </dl>
              {!quote.data.canCancel && (
                <FormError>
                  {quote.data.reason || 'customer.orders.cancel.notAllowed'}
                </FormError>
              )}
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t('customer.orders.cancel.reason')}
                </span>
                <textarea
                  {...register('reason')}
                  rows={3}
                  maxLength={ORDER_LIST.REASON_MAX}
                  required
                  disabled={isSubmitting || unknown || !quote.data.canCancel}
                  aria-invalid={!!errors.reason}
                  aria-describedby={errors.reason ? 'cancel-reason-error' : undefined}
                  className="w-full resize-y rounded-xl border border-input bg-background p-3 outline-none transition-[border-color,box-shadow] delay-0 duration-200 ease-in-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                />
              </label>
              {errors.reason && (
                <p
                  id="cancel-reason-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {t(errors.reason.message)}
                </p>
              )}
            </>
          )}
          <FormError>
            {error}
          </FormError>
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || unknown || quote.loading || !!quote.error || !quote.data?.canCancel}
            >
              {t(isSubmitting ? 'customer.orders.cancel.submitting' : 'customer.orders.cancel.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
