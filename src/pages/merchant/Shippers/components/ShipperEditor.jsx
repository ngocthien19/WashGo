import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceImage from '~/components/ResourceThumbnail/ResourceImage'
import FormError from '~/components/ui/FormError'
import { useCallback, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Save, X, Camera, UserRound, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import useImages from '~/hooks/useImages'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import { resolveMessage } from '~/i18n/messages'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'
import { getImageUrl } from '~/utils/format/formats'
import { shipperSchema, shipperSnapshot, shipperLimitConflict, SHIPPER_TASK_LIMIT } from '../shipperModel'

// Only operation identity and requested limit; never persist profile or identity document data.
const pendingUpdates = new Map()

function ShipperForm({ shipper, onClose, onSaved, onBusy }) {
  const { t } = useTranslation()
  const lock = useRef(false)
  const edit = Boolean(shipper)
  const [updateIntent, setUpdateIntent] = useState(() => edit ? pendingUpdates.get(shipper.id) : null)
  const [activeTaskCount, setActiveTaskCount] = useState(edit ? shipper.activeTaskCount : 0)
  const { register, control, handleSubmit, setError: setFieldError, formState: { errors } } = useForm({ resolver: yupResolver(shipperSchema), context: { activeTaskCount }, defaultValues: { fullName: shipper?.fullName || '', phone: shipper?.phone || '', email: shipper?.email || '', vehicleType: shipper?.vehicleType || 1, vehiclePlate: shipper?.vehiclePlate || '', identityNumber: shipper?.identityNumber || '', isActive: shipper?.isActive ?? true, maxActiveTasks: edit ? shipper.maxActiveTasks ?? '' : SHIPPER_TASK_LIMIT.default } })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(updateIntent ? 'merchant.shippers.uncertain' : '')
  const [uncertain, setUncertain] = useState(!!updateIntent)
  const [canRetryCreate, setCanRetryCreate] = useState(false)
  const createIntent = useRef(null)
  const [clearLegacy, setClearLegacy] = useState(false)
  const front = useImages(1, shipper?.identityFrontImageUrl ? [shipper.identityFrontImageUrl] : [])
  const back = useImages(1, shipper?.identityBackImageUrl ? [shipper.identityBackImageUrl] : [])
  const checkUpdate = async () => {
    if (lock.current || !updateIntent) {
      return
    }
    lock.current = true; onBusy(true); setPending(true); setError('')
    try {
      await merchantShipperApi.updateOperation(shipper.id, updateIntent)
      pendingUpdates.delete(shipper.id); setUpdateIntent(null)
      notify.success('merchant.shippers.updated'); onSaved()
    } catch {
      setError('shipperCapacity.lookupPending')
    } finally {
      lock.current = false; onBusy(false); setPending(false)
    }
  }
  const submit = async (values) => {
    if (lock.current || uncertain && !canRetryCreate) {
      return
    }
    if (Boolean(front.images.length) !== Boolean(back.images.length)) {
      setError('merchant.shippers.bothSides'); return
    }
    lock.current = true; onBusy(true)
    setPending(true)
    setError('')
    let writing = false
    try {
      if (edit) {
        const latest = await merchantShipperApi.detail(shipper.id)
        setActiveTaskCount(latest.activeTaskCount)
        if (values.maxActiveTasks < latest.activeTaskCount) {
          setFieldError('maxActiveTasks', { type: 'server', message: 'shipperCapacity.belowActive' }); return
        }
        if (!Number.isSafeInteger(shipper.revision) || shipperSnapshot(latest) !== shipperSnapshot(shipper)) {
          setUncertain(true)
          setError('merchant.shippers.changed')
          return
        }
        if (!values.isActive && latest.activeTaskCount > 0) {
          setError('merchant.shippers.activeTasks'); return
        }
      }
      const payload = { ...values, phone: values.phone.replace(/\D/g, ''), vehiclePlate: values.vehiclePlate || null, identityNumber: values.identityNumber || (edit ? '' : null) }
      const sidesChanged = front.images[0]?.url !== (shipper?.identityFrontImageUrl || undefined) || back.images[0]?.url !== (shipper?.identityBackImageUrl || undefined)
      if (!edit || sidesChanged || clearLegacy) {
        payload.identityFrontImageUrl = (await front.upload())[0] || ''
        payload.identityBackImageUrl = (await back.upload())[0] || ''
      }
      let result
      if (edit) {
        payload.expectedRevision = shipper.revision
        payload.operationId = crypto.randomUUID()
        const intent = { operationId: payload.operationId, maxActiveTasks: payload.maxActiveTasks }
        setUpdateIntent(intent); pendingUpdates.set(shipper.id, intent)
        writing = true
        result = await merchantShipperApi.update(shipper.id, payload)
        pendingUpdates.delete(shipper.id); setUpdateIntent(null)
      } else {
        if (!createIntent.current) {
          createIntent.current = { ...payload, clientRequestId: crypto.randomUUID() }
        }
        writing = true
        result = await merchantShipperApi.create(createIntent.current)
      }
      if (!edit && result.credentialDelivery !== 1) {
        notify.info(result.credentialDelivery === 2 ? 'merchant.shipperSync.emailFailed' : 'merchant.shipperSync.emailUnknown')
      }
      if (edit || result.credentialDelivery === 1) {
        notify.success(edit ? 'merchant.shippers.updated' : 'merchant.shippers.created')
      }
      onSaved()
    } catch (failure) {
      const conflict = shipperLimitConflict(failure)
      if (conflict) {
        setActiveTaskCount(conflict.activeTaskCount)
        setFieldError('maxActiveTasks', { type: 'server', message: 'shipperCapacity.belowActive' })
        pendingUpdates.delete(shipper.id); setUpdateIntent(null)
        return
      }
      const unknown = writing && (failure.uncertain || !failure.response || failure.response.status >= 500 || failure.response.status === 408)
      if (edit && !unknown) {
        pendingUpdates.delete(shipper.id); setUpdateIntent(null)
      }
      setUncertain(Boolean(unknown || failure.response?.status === 409))
      setCanRetryCreate(Boolean(unknown && !edit))
      if (!unknown && failure.response?.status !== 409) {
        createIntent.current = null
      }
      setError(failure.response?.status === 409 ? 'merchant.shippers.changed' : unknown ? 'merchant.shippers.uncertain' : getApiError(failure))
    } finally {
      lock.current = false; onBusy(false)
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={(event) => handleSubmit(submit)(event)}
      className="mt-5 space-y-5"
      noValidate
      data-dialog-layout
    >
      <div data-dialog-body>
        <fieldset
          disabled={pending || uncertain}
          className="grid gap-5 sm:grid-cols-2"
        >
          {['fullName', 'phone', 'email', 'vehiclePlate', 'identityNumber'].map((key) => (
            <div
              key={key}
              className={{ fullName: 'order-1 sm:col-span-2', phone: 'order-2', email: 'order-3', vehiclePlate: 'order-5', identityNumber: 'order-6 sm:col-span-2' }[key]}
            >
              <label
                htmlFor={`shipper-${key}`}
                className="mb-2 block text-base font-medium"
              >
                {t(`merchant.shippers.${key}`)}
                {['fullName', 'phone', 'email'].includes(key) && <span className="ml-1 text-destructive">*</span>}
              </label>
              <Input
                aria-describedby={errors[key] ? `shippereditor-${key}-error` : undefined}
                placeholder={t(`merchant.shippers.placeholders.${key}`)}
                id={`shipper-${key}`}
                type={key === 'email' ? 'email' : 'text'}
                autoComplete="off"
                {...register(key)}
                aria-invalid={Boolean(errors[key])}
                className="h-11 text-base"
              />
              {errors[key] && (
                <p
                  id={`shippereditor-${key}-error`}
                  role="alert"
                  className="mt-1 text-sm text-destructive"
                >
                  {t(`merchant.shippers.invalid.${key}`)}
                </p>
              )}
            </div>
          ))}
          <div className="order-4">
            <label
              htmlFor="shipper-vehicle"
              className="mb-2 block text-base font-medium"
            >
              {t('merchant.shippers.vehicleType')}
              <span className="ml-1 text-destructive">*</span>
            </label>
            <Controller
              name="vehicleType"
              control={control}
              render={({ field }) => (
                <SelectField
                  aria-describedby={errors.vehicleType ? 'shippereditor-vehicleType-error' : undefined}
                  aria-invalid={!!errors['vehicleType']}
                  id="shipper-vehicle"
                  label={t('merchant.shippers.vehicleType')}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[1, 2, 3].map((value) => ({ value, label: t(`merchant.shippers.vehicles.${value}`) }))}
                />
              )}
            />
            <FormError
              inline
              id="shippereditor-vehicleType-error"
            >
              {errors.vehicleType?.message || (errors.vehicleType ? 'forms.invalidValue' : '')}
            </FormError>
          </div>
          <div className="order-7 sm:col-span-2">
            <label
              htmlFor="shipper-max-tasks"
              className="mb-2 block text-base font-medium"
            >
              {t('shipperCapacity.limit')}
              <span className="ml-1 text-destructive">*</span>
            </label>
            <Input
              id="shipper-max-tasks"
              aria-label={t('shipperCapacity.limit')}
              type="number"
              min={SHIPPER_TASK_LIMIT.min}
              max={SHIPPER_TASK_LIMIT.max}
              step={1}
              {...register('maxActiveTasks')}
              aria-invalid={!!errors.maxActiveTasks}
              aria-describedby="shipper-max-tasks-hint shipper-max-tasks-error"
              className="h-11 text-base"
            />
            <p
              id="shipper-max-tasks-hint"
              className="mt-2 text-sm text-muted-foreground"
            >
              {t('shipperCapacity.limitHint')}
              {edit && Number.isSafeInteger(activeTaskCount) && ` ${t('shipperCapacity.currentTasks', { count: activeTaskCount })}`}
            </p>
            {errors.maxActiveTasks && (
              <p
                id="shipper-max-tasks-error"
                role="alert"
                className="mt-1 text-sm text-destructive"
              >
                {t(errors.maxActiveTasks.message, { count: activeTaskCount })}
              </p>
            )}
          </div>
          {edit && (
            <div className="order-7">
              <label
                htmlFor="shipper-active"
                className="mb-2 block text-base font-medium"
              >
                {t('merchant.shippers.workState')}
              </label>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <SelectField
                    aria-describedby={errors.isActive ? 'shippereditor-isActive-error' : undefined}
                    aria-invalid={!!errors['isActive']}
                    id="shipper-active"
                    label={t('merchant.shippers.workState')}
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(value === 'true')}
                    options={['true', 'false'].map((value) => ({ value, label: t(`merchant.shippers.active.${value}`) }))}
                  />
                )}
              />
              <FormError
                inline
                id="shippereditor-isActive-error"
              >
                {errors.isActive?.message || (errors.isActive ? 'forms.invalidValue' : '')}
              </FormError>
            </div>
          )}
          <section className="order-8 space-y-3 rounded-2xl border border-border bg-muted/20 p-4 sm:col-span-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <ShieldCheck
                size={18}
                className="text-primary"
              />
              {t('merchant.shippers.identityImages')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('merchant.shippers.twoImagesHint')}
            </p>
            {edit && shipper.identityImageSides === 'Unspecified' && !clearLegacy && (
              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-sm text-muted-foreground">
                  {t('merchant.shipperSync.legacyImages')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(shipper.identityImageUrls || []).map((url) => (
                    <ResourceImage
                      key={url}
                      src={getImageUrl(url)}
                      alt={t('merchant.shippers.identityImages')}
                      className="h-20 w-24 rounded-lg object-contain"
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setClearLegacy(true)}
                >
                  {t('merchant.shipperSync.clearLegacy')}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {[{ key: 'front', resource: front }, { key: 'back', resource: back }].map(({ key, resource }) => (
                <div
                  key={key}
                  className="relative"
                >
                  {(
                    <input
                      id={`identity-${key}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="peer sr-only"
                      disabled={pending || uncertain}
                      aria-label={t(`merchant.shippers.${key}`)}
                      onChange={(event) => {
                        const file = event.target.files?.[0]; if (file) {
                          resource.addFiles([file])
                        } event.target.value = ''
                      }}
                    />
                  )}
                  <label
                    htmlFor={`identity-${key}`}
                    className={`flex min-h-32 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-input bg-background p-3 text-sm text-muted-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${!resource.images.length ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : ''}`}
                  >
                    {resource.images[0]?.url ? (
                      <ResourceImage
                        src={getImageUrl(resource.images[0]?.url)}
                        alt={t(`merchant.shippers.${key}`)}
                        className="h-24 w-full rounded-lg object-contain"
                      />
                    ) : (
                      <Camera
                        size={25}
                        className="text-primary/60"
                      />
                    )}
                    {t(`merchant.shippers.${key}`)}
                  </label>
                  {resource.images.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-xs"
                      className="absolute right-2 top-2"
                      aria-label={t('merchant.shippers.removeImage')}
                      onClick={() => resource.removeImage(resource.images[0])}
                    >
                      <X size={14} />
                    </Button>
                  )}
                  {resource.error && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-destructive"
                    >
                      {t(resource.error)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-base text-destructive"
          >
            {resolveMessage(error)}
          </p>
        )}
      </div>
      <div
        className="flex justify-end gap-3 border-t border-border pt-4"
        data-dialog-footer
      >
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onClose}
          className="h-11 px-5 text-base"
        >
          {t('common.close')}
        </Button>
        <Button
          type={edit && uncertain && updateIntent ? 'button' : 'submit'}
          onClick={edit && uncertain && updateIntent ? checkUpdate : undefined}
          disabled={pending || uncertain && !canRetryCreate && !(edit && updateIntent)}
          className="h-11 px-5 text-base"
        >
          <Save size={18} />
          {t(pending ? 'merchant.shippers.saving' : uncertain && edit && updateIntent ? 'shipperCapacity.checkResult' : uncertain && !edit ? 'merchant.shipperSync.retryCreate' : 'merchant.shippers.save')}
        </Button>
      </div>
    </form>
  )
}

export default function ShipperEditor({ shipper, id, onClose, onSaved }) {
  const { t } = useTranslation()
  const lock = useRef(false)
  const onBusy = useCallback(value => {
    lock.current = value
  }, [])
  const edit = Boolean(id || shipper)
  const load = useCallback(signal => id ? merchantShipperApi.detail(id, signal) : Promise.resolve(shipper), [id, shipper])
  const resource = useCatalogResource(load)
  const current = id ? resource.data : shipper
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
        closeLabel="common.close"
        data-dialog-fixed
      >
        <div data-dialog-header>
          <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserRound size={22} />
            </span>
            {t(edit ? 'merchant.shippers.edit' : 'merchant.shippers.add')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t(edit ? 'merchant.shippers.editHint' : 'merchant.shippers.createHint')}
          </DialogDescription>
        </div>
        {id && (resource.loading || resource.error || !current) ? (
          <div data-dialog-body>
            <ResourceFeedback
              {...resource}
              loadingText="merchant.loading"
            />
          </div>
        ) : (
          <ShipperForm
            shipper={current}
            onClose={onClose}
            onSaved={onSaved}
            onBusy={onBusy}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
