import StorageOrderPanel from '~/components/storage/StorageOrderPanel'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { PackageOpen, Truck, CircleCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import OtpInput from '~/components/ui/OtpInput'
import DeliveryLocker from '../components/DeliveryLocker'
import { taskLocker } from '../components/deliveryLockerModel'
import FormError from '~/components/ui/FormError'
import QrScanInput from '~/components/customer/orders/QrScanInput'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { credentialSchema, matchesTaskQr, taskSnapshot, canCompleteTask } from './taskModel'

function NormalTaskActionDialog({ order, shipperId, onClose, onSaved, onUnknown }) {
  const { t } = useTranslation()
  const type = order.assignedTaskType
  const Icon = type === 1 ? PackageOpen : Truck
  const { register, handleSubmit, control, setValue, resetField, clearErrors, formState: { errors } } = useForm({ resolver: yupResolver(credentialSchema), defaultValues: { mode: 'pin', pinCode: '', qrCode: '', confirmed: false } })
  const [mode, qrCode] = useWatch({ control, name: ['mode', 'qrCode'] })
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [unknown, setUnknown] = useState(shipperTaskApi.hasPending(order))
  const check = async () => {
    if (lock.current) {
      return
    }
    lock.current = true; setPending(true)
    try {
      const result = await shipperTaskApi.check(order); onSaved(result)
    } catch (failure) {
      setError(getApiError(failure))
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const [error, setError] = useState('')
  const changeMode = (next) => {
    setValue('mode', next); resetField('pinCode'); setValue('qrCode', ''); resetField('confirmed'); clearErrors(); setError('')
  }
  const submit = async (values) => {
    if (lock.current || blocked || unknown) {
      return
    }
    if (mode === 'qr' && !matchesTaskQr(values.qrCode, order.orderCode, type)) {
      setError('shipper.tasks.wrongQr'); return
    }
    lock.current = true
    setPending(true)
    setError('')
    let writing = false
    try {
      const current = await shipperTaskApi.detail(order.taskId)
      if (!canCompleteTask(current, shipperId) || taskSnapshot(current) !== taskSnapshot(order)) {
        setBlocked(true); setError('shipper.tasks.changed'); return
      }
      writing = true
      const result = await shipperTaskApi.complete(current, type, values.mode === 'pin' ? { pinCode: values.pinCode.trim() } : { qrCode: values.qrCode.trim() })
      resetField('pinCode'); setValue('qrCode', '')
      notify.success(type === 1 ? 'shipper.tasks.collectSaved' : 'shipper.tasks.returnSaved', { box: result.boxNumber || '—' })
      onSaved(result)
    } catch (failure) {
      const unknown = writing && (failure.uncertain || !failure.response || failure.response.status >= 500)
      setError(unknown ? 'shipper.tasks.unknown' : getApiError(failure))
      if (unknown) {
        setUnknown(true); setBlocked(true); onUnknown()
      } else if (failure.response?.status === 409 || failure.response?.status === 404) {
        setBlocked(true)
      }
    } finally {
      lock.current = false
      setPending(false)
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
      <DialogContent className="max-w-2xl [&_button]:text-base">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <Icon />
            {t(type === 1 ? 'shipper.tasks.confirmCollect' : 'shipper.tasks.confirmReturn')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            {t('shipper.tasks.credentialHelp')}
          </DialogDescription>
        </DialogHeader>
        <div className="my-5 rounded-xl border border-border p-4">
          <p className="font-bold text-primary">
            {order.orderCode}
          </p>
          <div className="mt-3">
            <DeliveryLocker
              {...taskLocker(order)}
              autoBox={type === 2}
            />
          </div>
        </div>
        <form
          className="space-y-5"
          onSubmit={(event) => handleSubmit(submit)(event)}
        >
          <FormError>
            {error}
          </FormError>
          {unknown && (
            <Button
              type="button"
              disabled={pending}
              onClick={check}
            >
              {t('admin.sync.checkResult')}
            </Button>
          )}
          <fieldset
            disabled={pending || blocked || unknown}
            className="space-y-4"
          >
            <div className="flex gap-2 border-b border-border">
              <Button
                type="button"
                variant="ghost"
                className={`h-12 min-w-28 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-5 text-base hover:bg-transparent dark:hover:bg-transparent ${mode === 'pin' ? 'border-b-primary text-primary hover:text-primary' : 'border-b-transparent text-muted-foreground'}`}
                aria-pressed={mode === 'pin'}
                onClick={() => changeMode('pin')}
              >
                PIN
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`h-12 min-w-28 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-5 text-base hover:bg-transparent dark:hover:bg-transparent ${mode === 'qr' ? 'border-b-primary text-primary hover:text-primary' : 'border-b-transparent text-muted-foreground'}`}
                aria-pressed={mode === 'qr'}
                onClick={() => changeMode('qr')}
              >
                QR
              </Button>
            </div>
            {mode === 'pin' ? (
              <div>
                <p className="mb-3 text-sm font-medium">
                  {t('shipper.tasks.pin')}
                </p>
                <Controller
                  name="pinCode"
                  control={control}
                  render={({ field }) => (
                    <OtpInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      masked
                      autoComplete="off"
                      disabled={pending || blocked || unknown}
                      label="shipper.tasks.pin"
                      digitLabel="shipper.media.pinDigit"
                      error={errors.pinCode ? { message: 'shipper.tasks.invalidPin' } : undefined}
                    />
                  )}
                />
              </div>
            ) : (
              <>
                <QrScanInput
                  disabled={pending || blocked || unknown}
                  hasCode={Boolean(qrCode)}
                  onCode={(code) => setValue('qrCode', code, { shouldValidate: true })}
                  onClear={() => setValue('qrCode', '')}
                />
                {errors.qrCode && (
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t('shipper.tasks.wrongQr')}
                  </p>
                )}
              </>
            )}
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-primary"
                {...register('confirmed')}
              />
              {t(type === 1 ? 'shipper.tasks.collectCheck' : 'shipper.tasks.returnCheck')}
            </label>
            {errors.confirmed && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {t('shipper.tasks.checkRequired')}
              </p>
            )}
          </fieldset>
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              className="h-12 px-6 text-base"
              disabled={pending}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              className="h-12 px-6 text-base"
              disabled={pending || blocked || unknown}
            >
              <CircleCheck size={18} />
              {t(pending ? 'shipper.tasks.sending' : 'shipper.tasks.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TaskActionDialog(props) {
  const { t } = useTranslation()
  if (![3, 4].includes(props.order.assignedTaskType)) {
    return <NormalTaskActionDialog {...props} />
  }
  return (
    <Dialog
      open
      onOpenChange={open => !open && props.onClose()}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t('storage.taskAction')}
          </DialogTitle>
          <DialogDescription>
            {t('storage.simulation')}
          </DialogDescription>
        </DialogHeader>
        <StorageOrderPanel
          order={props.order}
          role="Shipper"
          taskId={props.order.taskId}
          onUpdated={() => props.onSaved({ storage: true })}
        />
      </DialogContent>
    </Dialog>
  )
}
