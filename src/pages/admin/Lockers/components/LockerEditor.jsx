import { lazy, Suspense, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, MapPinned, ImagePlus, X, ArrowUp, ArrowDown, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { SelectField } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import useImages from '~/hooks/useImages'
import { getImageUrl } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { adminLockerApi } from '~/apis/admin/adminLockerApi'
import { lockerSchema, lockerDefaults, lockerPayload, lockerSnapshot, unknownLockerWrite } from '../lockerModel'
import LockerDialogHeader from './LockerDialogHeader'

const AddressPicker = lazy(() => import('~/components/maps/AddressPickerDialog'))
const locationKey = value => JSON.stringify(['address', 'city', 'latitude', 'longitude'].map(key => String(value[key]).trim()))
export default function LockerEditor({ locker, merchants, onClose, onSaved }) {
  const { t } = useTranslation()
  const originalIds = [...(locker?.merchants || [])].sort((a, b) => a.priority - b.priority).map(row => row.merchantId)
  const [ids, setIds] = useState(originalIds), [mapOpen, setMapOpen] = useState(false)
  const [tab, setTab] = useState('basic'), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState('')
  const [confirmedLocation, setConfirmedLocation] = useState(locker ? locationKey(lockerDefaults(locker)) : '')
  const locked = useRef(false)
  const images = useImages(5, locker?.imageUrls || [])
  const { register, handleSubmit, setValue, getValues, control, formState: { errors } } = useForm({ resolver: yupResolver(lockerSchema), defaultValues: lockerDefaults(locker) })
  const values = useWatch({ control })
  const close = () => {
    if (!locked.current) {
      onClose()
    }
  }
  const submit = async values => {
    if (locked.current || uncertain) {
      return
    }
    if (locationKey(values) !== confirmedLocation) {
      setTab('basic'); setError('admin.lockers.mapRequired'); return
    }
    const changedIds = JSON.stringify(ids) !== JSON.stringify(originalIds)
    if ((!locker || changedIds) && (!ids.length || ids.some(id => !merchants.some(m => m.id === id && m.status === 1)))) {
      setTab('merchants'); setError('admin.lockers.merchantsRequired'); return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const check = async () => !locker || lockerSnapshot(await adminLockerApi.detail(locker.id)) === lockerSnapshot(locker)
      if (!await check()) {
        setError('admin.lockers.changed'); return
      }
      const urls = await images.upload()
      if (!await check()) {
        setError('admin.lockers.changed'); return
      }
      const body = lockerPayload(values, locker, locker && !changedIds ? null : ids, urls)
      writing = true
      const saved = await adminLockerApi[locker ? 'update' : 'create'](body)
      notify.success(locker ? 'admin.lockers.updated' : 'admin.lockers.created'); onSaved(saved)
    } catch (failure) {
      const unknown = writing && unknownLockerWrite(failure)
      setUncertain(unknown); setError(unknown ? 'admin.lockers.uncertain' : getApiError(failure))
      notify.error(unknown ? 'admin.lockers.uncertain' : getApiError(failure))
    } finally {
      locked.current = false; setPending(false)
    }
  }
  const move = (index, direction) => setIds(current => {
    const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next
  })
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          close()
        }
      }}
    >
      <DialogContent
        className="max-w-3xl"
        closeLabel="common.close"
      >
        <LockerDialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <PanelsTopLeft className="text-primary" />
            {t(locker ? 'admin.lockers.edit' : 'admin.lockers.create')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-6 text-muted-foreground">
            {t(locker ? 'admin.lockers.editHint' : 'admin.lockers.createHint')}
          </DialogDescription>
        </LockerDialogHeader>
        <form
          noValidate
          className="mt-5 space-y-5"
          onSubmit={event => handleSubmit(submit, invalid => {
            setTab('basic'); setError('admin.lockers.invalidFields'); if (invalid.boxCount || invalid.defaultBoxSize) {
              setTab('boxes')
            }
          })(event)}
        >
          <div
            role="tablist"
            aria-label={t('admin.lockers.editorTabs')}
            className="flex gap-3 overflow-x-auto border-b border-border"
          >
            {['basic', 'merchants', ...(!locker ? ['boxes'] : [])].map(key => (
              <Button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                variant="ghost"
                disabled={pending || uncertain}
                onClick={() => setTab(key)}
                className={`h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 text-base font-medium hover:bg-transparent dark:hover:bg-transparent ${tab === key ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
              >
                {t(`admin.lockers.tabs.${key}`)}
              </Button>
            ))}
          </div>
          <fieldset
            disabled={pending || uncertain}
            className="min-w-0 space-y-5"
          >
            {tab === 'basic' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {['code', 'name', 'address', 'ward', 'city', 'latitude', 'longitude', 'description'].map(key => (
                    <label
                      key={key}
                      className={`flex min-w-0 flex-col gap-3 text-sm font-medium ${['address', 'description'].includes(key) ? 'sm:col-span-2' : ''}`}
                    >
                      <span>
                        {t(`admin.lockers.fields.${key}`)}
                        {['name', 'address', 'city'].includes(key) && <span className="ml-1 text-destructive">*</span>}
                      </span>
                      <Input
                        {...register(key)}
                        aria-label={t(`admin.lockers.fields.${key}`)}
                        aria-invalid={!!errors[key]}
                        readOnly={['latitude', 'longitude'].includes(key) || key === 'code' && !!locker}
                        maxLength={key === 'name' || key === 'city' || key === 'ward' ? 100 : key === 'code' ? 50 : key === 'address' ? 500 : key === 'description' ? 2000 : undefined}
                        placeholder={t(`admin.lockers.placeholders.${key}`)}
                        className="h-11 min-w-0 rounded-xl text-base font-normal read-only:bg-muted/40"
                      />
                      {errors[key] && (
                        <span className="text-xs text-destructive">
                          {t('admin.lockers.invalidField')}
                        </span>
                      )}
                    </label>
                  ))}
                  <label className="grid gap-3 text-sm font-medium">
                    <span>
                      {t('merchant.lockers.type')}
                    </span>
                    <SelectField
                      label={t('merchant.lockers.type')}
                      value={String(values.lockerType)}
                      onValueChange={value => setValue('lockerType', Number(value))}
                      options={[1, 2].map(value => ({ value: String(value), label: t(`merchant.lockers.types.${value}`) }))}
                    />
                  </label>
                  {locker && (
                    <label className="grid gap-3 text-sm font-medium">
                      <span>
                        {t('merchant.lockers.status')}
                      </span>
                      <SelectField
                        label={t('merchant.lockers.status')}
                        value={String(values.status)}
                        onValueChange={value => setValue('status', Number(value))}
                        options={[1, 2, 3].map(value => ({ value: String(value), label: t(`merchant.lockers.statuses.${value}`) }))}
                      />
                    </label>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMapOpen(true)}
                  className="h-11 border-violet-500/25 bg-violet-500/10 px-5 text-base text-violet-700 dark:text-violet-300"
                >
                  <MapPinned size={18} />
                  {t('customer.addressMap.open')}
                </Button>
                <section className="space-y-4 rounded-xl border border-border p-4">
                  <h3 className="border-b border-border pb-3 text-base font-semibold">
                    {t('admin.lockers.images')}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {images.images.map(image => (
                      <div
                        key={image.url}
                        className="relative size-20"
                      >
                        <img
                          src={getImageUrl(image.url)}
                          alt={t('admin.lockers.images')}
                          className="size-full rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute -right-1 -top-1 size-7"
                          aria-label={t('merchant.shop.removeImage')}
                          onClick={() => images.removeImage(image)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-3 text-primary">
                    <ImagePlus size={18} />
                    {t('merchant.shop.addImages')}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={t('merchant.shop.addImages')}
                      className="sr-only"
                      disabled={images.images.length >= 5}
                      onChange={event => {
                        images.addFiles(Array.from(event.target.files || [])); event.target.value = ''
                      }}
                    />
                  </label>
                  {images.error && (
                    <p className="text-sm text-destructive">
                      {t(images.error)}
                    </p>
                  )}
                </section>
              </>
            )}
            {tab === 'merchants' && (
              <section className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {t('admin.lockers.priorityHint')}
                </p>
                <SelectField
                  label={t('admin.lockers.addMerchant')}
                  value=""
                  onValueChange={id => {
                    if (id && !ids.includes(id)) {
                      setIds([...ids, id])
                    }
                  }}
                  options={[{ value: '', label: t('admin.lockers.addMerchant') }, ...merchants.filter(m => m.status === 1 && !ids.includes(m.id)).map(m => ({ value: m.id, label: m.name }))]}
                />
                <ol className="space-y-3">
                  {ids.map((id, index) => {
                    const merchant = merchants.find(m => m.id === id), existing = locker?.merchants.find(m => m.merchantId === id)
                    return (
                      <li
                        key={id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 basis-32 break-words font-semibold">
                          {merchant?.name || existing?.businessName || id}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('admin.lockers.moveUp', { name: merchant?.name || existing?.businessName })}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={17} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('admin.lockers.moveDown', { name: merchant?.name || existing?.businessName })}
                          disabled={index === ids.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={17} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('admin.lockers.removeMerchant', { name: merchant?.name || existing?.businessName })}
                          onClick={() => setIds(ids.filter(value => value !== id))}
                        >
                          <X size={17} />
                        </Button>
                      </li>
                    )
                  })}
                </ol>
                {!ids.length && (
                  <p className="py-3 text-sm text-muted-foreground">
                    {t('admin.lockers.noMerchants')}
                  </p>
                )}
              </section>
            )}
            {tab === 'boxes' && (
              <section className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {t('admin.lockers.boxCreateHint')}
                </p>
                <label className="grid gap-3 text-sm">
                  <span>
                    {t('merchant.lockers.totalBoxes')}
                  </span>
                  <Input
                    {...register('boxCount')}
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    aria-label={t('merchant.lockers.totalBoxes')}
                    className="h-11 rounded-xl text-base"
                  />
                  {errors.boxCount && (
                    <span className="text-destructive">
                      {t('admin.lockers.invalidField')}
                    </span>
                  )}
                </label>
                <label className="grid gap-3 text-sm">
                  <span>
                    {t('admin.lockers.defaultBoxSize')}
                  </span>
                  <SelectField
                    label={t('admin.lockers.defaultBoxSize')}
                    value={String(values.defaultBoxSize)}
                    onValueChange={value => setValue('defaultBoxSize', Number(value))}
                    options={[1, 2, 3].map(value => ({ value: String(value), label: t(`merchant.lockers.sizes.${value}`) }))}
                  />
                </label>
              </section>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm leading-6 text-destructive"
            >
              {t(error)}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={close}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={pending || uncertain}
              className="h-11 px-6 text-base"
            >
              <Save size={18} />
              {t(pending ? 'admin.lockers.saving' : 'admin.lockers.save')}
            </Button>
          </footer>
        </form>
        {mapOpen && (
          <Suspense fallback={(
            <p className="py-4">
              {t('merchant.loading')}
            </p>
          )}
          >
            <AddressPicker
              initialCenter={Number.isFinite(Number(values.latitude)) && Number.isFinite(Number(values.longitude)) && (Number(values.latitude) !== 0 || Number(values.longitude) !== 0) ? { latitude: Number(values.latitude), longitude: Number(values.longitude) } : null}
              onClose={() => setMapOpen(false)}
              onApply={value => {
                for (const key of ['address', 'city']) {
                  if (value[key]) {
                    setValue(key, value[key], { shouldValidate: true })
                  }
                }
                setValue('latitude', value.position.latitude); setValue('longitude', value.position.longitude); setConfirmedLocation(locationKey(getValues())); setMapOpen(false)
              }}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  )
}
