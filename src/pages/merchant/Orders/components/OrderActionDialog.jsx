import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { SelectField } from '~/components/ui/select'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderApi } from '~/apis/merchant/merchantOrderApi'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { processingSteps, canWeigh, assignmentTask, validWeight, sameOrderState, statusLabel } from '../orderModel'

function ShipperSelection({ id, value, onChange, disabled }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => merchantOrderApi.shippers(id, signal), [id])
  const resource = useCatalogResource(load)
  if (resource.loading || resource.error || !resource.data?.length) {
    return (
      <ResourceFeedback
        {...resource}
        loadingText="merchant.loading"
        empty="merchant.orders.noShippers"
      />
    )
  }
  return (
    <SelectField
      label={t('merchant.orders.shipper')}
      value={value?.id || ''}
      disabled={disabled}
      onValueChange={(next) => onChange(resource.data.find((item) => item.id === next))}
      options={[{ value: '', label: t('merchant.orders.chooseShipper') }, ...resource.data.map((item) => ({ value: item.id, label: [item.fullName, item.vehiclePlate, item.phone].filter(Boolean).join(' · ') }))]}
    />
  )
}

export default function OrderActionDialog({ action, order, onClose, onSaved }) {
  const { t } = useTranslation()
  const [weight, setWeight] = useState(order.actualWeightKg == null ? '' : String(order.actualWeightKg))
  const [next, setNext] = useState(String(processingSteps(order)[0] || ''))
  const [shipper, setShipper] = useState(null)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || uncertain) {
      return
    }
    if ((action === 'weigh' && (!canWeigh(order) || !validWeight(weight))) || (action === 'process' && !processingSteps(order).includes(Number(next))) || (action === 'assign' && (!assignmentTask(order) || !shipper)) || note.trim().length > 500) {
      setError('merchant.orders.invalidAction'); return
    }
    lock.current = true
    setPending(true)
    setError('')
    let writing = false
    try {
      const latest = await merchantOrderApi.detail(order.id)
      if (!sameOrderState(order, latest)) {
        setUncertain(true); setError('merchant.orders.changed'); return
      }
      writing = true
      if (action === 'weigh') {
        await merchantOrderApi.weigh(order.id, Number(weight))
      }
      if (action === 'process') {
        await merchantOrderApi.status(order.id, Number(next), note.trim() || null)
      }
      if (action === 'assign') {
        await merchantOrderApi.assign(order.id, shipper, note.trim() || null)
      }
      notify.success('merchant.orders.saved')
      onSaved()
    } catch (failure) {
      const unknown = writing && (failure.uncertain || !failure.response || failure.response.status >= 500)
      setUncertain(unknown)
      setError(unknown ? 'merchant.orders.uncertain' : getApiError(failure))
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
        className="max-w-xl"
      >
        <DialogTitle className="pr-8 text-2xl font-bold">
          {t(`merchant.orders.${action}`)}
        </DialogTitle>
        <DialogDescription className="mt-2 border-b border-border pb-5 text-base text-muted-foreground">
          {order.orderCode}
          {' '}
          ·
          {' '}
          {t(`merchant.orders.${action}Note`)}
        </DialogDescription>
        <form
          onSubmit={submit}
          className="mt-5 space-y-5"
        >
          <fieldset
            disabled={pending || uncertain}
            className="space-y-4"
          >
            {action === 'weigh' && (
              <label className="block space-y-2 text-base font-medium">
                <span>
                  {t('merchant.orders.weightInput')}
                </span>
                <Input
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  required
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className="h-12 text-base"
                />
              </label>
            )}
            {action === 'process' && (
              <SelectField
                label={t('merchant.orders.nextStatus')}
                value={next}
                onValueChange={setNext}
                disabled={pending || uncertain}
                options={processingSteps(order).map((value) => ({ value: String(value), label: t(statusLabel(value)) }))}
              />
            )}
            {action === 'assign' && (
              <ShipperSelection
                id={order.id}
                value={shipper}
                onChange={setShipper}
                disabled={pending || uncertain}
              />
            )}
            {action !== 'weigh' && (
              <label className="block space-y-2 text-base">
                <span>
                  {t('merchant.orders.note')}
                </span>
                <textarea
                  value={note}
                  maxLength={500}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="text-base text-destructive"
            >
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-4 text-base"
              disabled={pending}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              className="h-11 px-4 text-base"
              disabled={pending || uncertain || (action === 'assign' && !shipper)}
            >
              {t(pending ? 'merchant.orders.saving' : 'merchant.orders.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
