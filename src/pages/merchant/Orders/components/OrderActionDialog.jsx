import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Truck, MapPin, CircleCheck, Package } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
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
    <fieldset
      className="space-y-3"
      disabled={disabled}
    >
      <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-base font-semibold">
        {t('merchant.orders.chooseShipper')}
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {t('merchant.shippers.eligibleCount', { count: resource.data.length })}
        </span>
      </legend>
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {resource.data.map((item) => (
          <label
            key={item.id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${value?.id === item.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-background hover:border-primary/40'} has-focus-visible:ring-2 has-focus-visible:ring-primary`}
          >
            <UserAvatar
              avatar={item.avatar}
              fullName={item.fullName}
              className="size-11 text-sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-base font-semibold">
                {item.fullName}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {[item.vehiclePlate, item.phone].filter(Boolean).join(' · ') || '—'}
              </span>
            </span>
            <input
              type="radio"
              name="assignment-shipper"
              aria-label={item.fullName}
              checked={value?.id === item.id}
              onChange={() => onChange(item)}
              className="size-5 shrink-0 accent-primary"
            />
          </label>
        ))}
      </div>
    </fieldset>
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
  const [canRetry, setCanRetry] = useState(false)
  const [canCheck, setCanCheck] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const intent = useRef(null)
  const operation = { weigh: 'UpdateWeight', process: 'UpdateStatus', assign: 'AssignShipper' }[action]
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
    if (lock.current || uncertain && !canRetry) {
      return
    }
    if (!intent.current && ((action === 'weigh' && (!canWeigh(order) || !validWeight(weight))) || (action === 'process' && !processingSteps(order).includes(Number(next))) || (action === 'assign' && (!assignmentTask(order) || !shipper)) || note.trim().length > 500)) {
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
        if ((action === 'weigh' && !canWeigh(latest)) || (action === 'process' && !processingSteps(latest).includes(Number(next))) || (action === 'assign' && !assignmentTask(latest))) {
          setUncertain(true); setError('merchant.orders.changed'); return
        }
        intent.current = { weight: Number(weight), next: Number(next), shipper, note: note.trim() || null, guard: { expectedRevision: order.revision, expectedStatus: order.status, operationId: crypto.randomUUID() } }
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
      complete()
    } catch (failure) {
      const unknown = writing && (failure.uncertain || !failure.response || failure.response.status >= 500)
      const conflict = failure.response?.status === 409
      setUncertain(unknown || conflict)
      setCanCheck(unknown)
      if (!unknown && !conflict) {
        intent.current = null
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
      >
        <DialogTitle className={action === 'assign' ? '-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8' : 'pr-8 text-2xl font-bold'}>
          {action === 'assign' && (
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Truck size={23} />
            </span>
          )}
          {t(`merchant.orders.${action}`)}
        </DialogTitle>
        <DialogDescription className="mt-2 border-b border-border pb-5 text-base text-muted-foreground">
          {order.orderCode}
          {' '}
          ·
          {' '}
          {t(`merchant.orders.${action}Note`)}
        </DialogDescription>
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
              disabled={pending || uncertain && !canRetry || (action === 'assign' && !shipper)}
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
