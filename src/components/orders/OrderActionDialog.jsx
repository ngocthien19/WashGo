import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Truck, MapPin, CircleCheck, Package } from 'lucide-react'
import ShipperPicker from '~/components/shippers/ShipperSelection'
import { canAssignShipper, isShipperCapacityConflict } from '~/utils/orders/shipperCapacity'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import { SelectField } from '~/components/ui/select'
import useCatalogResource from '~/hooks/useCatalogResource'
import { orderManagementApi as merchantOrderApi } from '~/apis/orders/orderManagementApi'
import { notify } from '~/utils/notifications/notifications'
import { getApiError } from '~/utils/http/apiError'
import { processingSteps, canWeigh, assignmentTask, validWeight, sameOrderState, statusLabel } from '~/utils/orders/orderManagement'
import { useOrderChangedSinceOpen } from '~/hooks/useOrderRealtime'

function ShipperSelection({ id, value, onChange, disabled }) {
  const load = useCallback(signal => merchantOrderApi.shippers(id, signal), [id])
  const resource = useCatalogResource(load)
  return (
    <ShipperPicker
      resource={resource}
      value={value?.id}
      onChange={onChange}
      disabled={disabled}
    />
  )
}

export default function OrderActionDialog({ action, order: currentOrder, onClose, onSaved }) {
  const { t } = useTranslation()
  const [order] = useState(currentOrder)
  const changed = useOrderChangedSinceOpen(order.id)
  const liveStale = changed || currentOrder.revision !== order.revision
  const [weight, setWeight] = useState(order.actualWeightKg == null ? '' : String(order.actualWeightKg))
  const [next, setNext] = useState(String(processingSteps(order)[0] || ''))
  const [shipper, setShipper] = useState(null)
  const [shipperReload, setShipperReload] = useState(0)
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const needsConfirmation = ['returnReady', 'unassign'].includes(action)
  const canAct = value => action === 'returnReady' ? value.allowedActions?.canConfirmReturnReady === true : action === 'unassign' ? value.allowedActions?.canUnassignShipper === true : true
  const [pending, setPending] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const [canCheck, setCanCheck] = useState(false)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState({})
  const lock = useRef(false)
  const intent = useRef(null)
  const [hasIntent, setHasIntent] = useState(false)
  const operation = { weigh: 'UpdateWeight', process: 'UpdateStatus', assign: 'AssignShipper', returnReady: 'ConfirmReturnReady', unassign: 'UnassignShipper' }[action]
  const complete = () => {
    notify.success('merchant.orders.saved'); onSaved()
  }
  const checkResult = async () => {
    if (lock.current || !intent.current) {
      return
    }
    lock.current = true; setPending(true); setCanRetry(false)
    try {
      const result = await merchantOrderApi.operation(order.id, intent.current.guard.operationId, operation)
      if (result) {
        complete(); return
      }
      setCanRetry(true); setError('merchant.orderSync.notRecorded')
    } catch {
      setError('merchant.orderSync.lookupFailed')
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || uncertain && !canRetry || liveStale && !intent.current) {
      return
    }
    if (!intent.current) {
      const fields = { weight: action === 'weigh' && !validWeight(weight), next: action === 'process' && !processingSteps(order).includes(Number(next)), shipper: action === 'assign' && !canAssignShipper(shipper), note: note.trim().length > 500, confirmed: needsConfirmation && !confirmed }
      setValidation(fields)
      if (Object.values(fields).some(Boolean)) {
        return
      }
    }
    if (!intent.current && (!canAct(order) || (action === 'weigh' && !canWeigh(order)) || (action === 'assign' && !assignmentTask(order)))) {
      setError('merchant.orders.invalidAction'); return
    }
    lock.current = true
    setPending(true)
    setError('')
    let writing = false
    try {
      if (!intent.current) {
        const latest = await merchantOrderApi.detail(order.id)
        if (!sameOrderState(order, latest)) {
          setUncertain(true); setError('merchant.orders.changed'); return
        }
        if (!canAct(latest) || (action === 'weigh' && !canWeigh(latest)) || (action === 'process' && !processingSteps(latest).includes(Number(next))) || (action === 'assign' && !assignmentTask(latest))) {
          setUncertain(true); setError('merchant.orders.changed'); return
        }
        if (action === 'assign') {
          const candidates = await merchantOrderApi.shippers(order.id)
          if (!candidates.some(row => row.id === shipper?.id && canAssignShipper(row))) {
            setShipper(null); setShipperReload(value => value + 1); setError('shipperCapacity.changed'); return
          }
        }
        intent.current = { weight: Number(weight), next: Number(next), shipper, note: note.trim() || null, guard: { expectedRevision: order.revision, expectedStatus: order.status, operationId: crypto.randomUUID() } }
        setHasIntent(true)
      }
      const request = intent.current
      setCanRetry(false)
      writing = true
      if (action === 'weigh') {
        await merchantOrderApi.weigh(order.id, request.weight, request.guard)
      }
      if (action === 'process') {
        await merchantOrderApi.status(order.id, request.next, request.note, request.guard)
      }
      if (action === 'assign') {
        await merchantOrderApi.assign(order.id, request.shipper, request.note, request.guard)
      }
      if (needsConfirmation) {
        await merchantOrderApi[action](order.id, request.note, request.guard)
      }
      complete()
    } catch (failure) {
      if (action === 'assign' && isShipperCapacityConflict(failure)) {
        intent.current = null; setHasIntent(false); setShipper(null); setShipperReload(value => value + 1)
        setUncertain(false); setCanRetry(false); setCanCheck(false); setError('shipperCapacity.changed'); return
      }
      const unknown = writing && (failure.uncertain || !failure.response || failure.response.status >= 500)
      const conflict = failure.response?.status === 409
      setUncertain(unknown || conflict)
      setCanCheck(unknown)
      if (!unknown && !conflict) {
        intent.current = null
        setHasIntent(false)
      }
      setError(conflict ? 'merchant.orderSync.conflict' : unknown ? 'merchant.orders.uncertain' : getApiError(failure))
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
        className="max-w-xl border-primary/15"
        data-dialog-fixed
      >
        <div
          data-dialog-header
          style={action === 'returnReady' ? { paddingBottom: '0.75rem' } : undefined}
        >
          <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-semibold sm:-mx-8 sm:-mt-8 sm:px-8">
            {action === 'assign' && (
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Truck size={23} />
              </span>
            )}
            {t(`merchant.orders.${action}`)}
          </DialogTitle>
          <DialogDescription className={`mt-2 text-base text-muted-foreground ${action === 'returnReady' ? '' : 'border-b border-border pb-5'}`}>
            <span className="mr-2 inline-flex rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">
              {order.orderCode}
            </span>
            {' '}
            ·
            {' '}
            {t(`merchant.orders.${action}Note`)}
          </DialogDescription>
        </div>
        <form
          noValidate
          onSubmit={submit}
          className="mt-5 space-y-5"
          data-dialog-layout
        >
          <div data-dialog-body>
            {action === 'assign' && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:grid-cols-2">
                <div className="flex gap-2">
                  <MapPin
                    size={18}
                    className="mt-1 shrink-0 text-primary"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('merchant.shippers.assignmentLocation')}
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {assignmentTask(order) === 2 ? t('merchant.shippers.returnTask') : (order.lockerName || '—')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Package
                    size={18}
                    className="mt-1 shrink-0 text-primary"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('merchant.shippers.taskType')}
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {t(assignmentTask(order) === 1 ? 'merchant.orders.assignCollect' : 'merchant.orders.assignReturn')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <fieldset
              disabled={pending || uncertain || liveStale}
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
                    onChange={(event) => {
                      setWeight(event.target.value); setValidation(current => ({ ...current, weight: false }))
                    }}
                    aria-invalid={!!validation.weight}
                    aria-describedby={validation.weight ? 'order-weight-error' : undefined}
                    className="h-12 text-base"
                  />
                  <FormError
                    inline
                    id="order-weight-error"
                  >
                    {validation.weight ? 'forms.weight' : ''}
                  </FormError>
                </label>
              )}
              {action === 'process' && (
                <SelectField
                  showLabel
                  aria-invalid={!!validation.next}
                  aria-describedby={validation.next ? 'order-next-error' : undefined}
                  label={t('merchant.orders.nextStatus')}
                  value={next}
                  onValueChange={value => {
                    setNext(value); setValidation(current => ({ ...current, next: false }))
                  }}
                  disabled={pending || uncertain}
                  options={processingSteps(order).map((value) => ({ value: String(value), label: t(statusLabel(value)) }))}
                />
              )}
              <FormError
                inline
                id="order-next-error"
              >
                {validation.next ? 'forms.invalidValue' : ''}
              </FormError>
              {action === 'assign' && (
                <ShipperSelection
                  key={shipperReload}
                  id={order.id}
                  value={shipper}
                  onChange={value => {
                    setShipper(value); setValidation(current => ({ ...current, shipper: false }))
                  }}
                  disabled={pending || uncertain}
                />
              )}
              <FormError inline>
                {validation.shipper ? 'forms.invalidValue' : ''}
              </FormError>
              {needsConfirmation && (
                <label className="flex items-start gap-3 text-base leading-6">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    checked={confirmed}
                    onChange={event => {
                      setConfirmed(event.target.checked); setValidation(current => ({ ...current, confirmed: false }))
                    }}
                    aria-invalid={!!validation.confirmed}
                  />
                  <span>
                    {t(`merchant.orders.${action}Confirmation`)}
                  </span>
                </label>
              )}
              <FormError inline>
                {validation.confirmed ? 'forms.confirmRequired' : ''}
              </FormError>
              {action !== 'weigh' && (
                <label className="block space-y-2 text-base">
                  <span>
                    {t('merchant.orders.note')}
                  </span>
                  <textarea
                    value={note}
                    aria-invalid={!!validation.note}
                    aria-describedby={validation.note ? 'order-note-error' : undefined}
                    maxLength={500}
                    onChange={(event) => {
                      setNote(event.target.value); setValidation(current => ({ ...current, note: false }))
                    }}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <FormError
                    inline
                    id="order-note-error"
                  >
                    {validation.note ? 'forms.invalidValue' : ''}
                  </FormError>
                </label>
              )}
            </fieldset>
            {(error || liveStale) && (
              <p
                role="alert"
                className="text-base text-destructive"
              >
                {t(liveStale && !hasIntent ? 'orderLive.changed' : error)}
              </p>
            )}
            {canCheck && (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4 text-base"
                disabled={pending}
                onClick={checkResult}
              >
                {t('merchant.orderSync.checkResult')}
              </Button>
            )}
          </div>
          <div
            className="flex flex-wrap justify-end gap-3 border-t border-border pt-4"
            data-dialog-footer
          >
            {liveStale && !hasIntent && (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4 text-base"
                disabled={pending}
                onClick={onSaved}
              >
                {t('orderLive.review')}
              </Button>
            )}
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
              disabled={pending || uncertain && !canRetry || liveStale && !hasIntent || (action === 'assign' && !shipper)}
            >
              {action === 'assign' && <CircleCheck size={18} />}
              {t(pending ? 'merchant.orders.saving' : canRetry ? 'merchant.orderSync.retrySame' : 'merchant.orders.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
