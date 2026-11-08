import { lazy, Suspense, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Store, Save, MapPinned, ImagePlus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import useImages from '~/hooks/useImages'
import { getImageUrl } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { adminMerchantApi } from '~/apis/admin/adminMerchantApi'
import { merchantSchema, merchantDefaults, merchantPayload, merchantSnapshot, unknownWrite } from '../merchantModel'
import MerchantDialogHeader from './MerchantDialogHeader'

const AddressPicker = lazy(() => import('~/components/maps/AddressPickerDialog'))
const fields = {
  basic: ['businessName', 'email', 'phone', 'taxCode', 'businessLicense', 'openingHours'],
  contract: ['depositAmount', 'commissionRate', 'maxCapacity', 'contractStartDate', 'contractEndDate', 'slaDocUrl'],
  region: ['address', 'city', 'latitude', 'longitude', 'serviceRadiusKm']
}
const required = ['businessName', 'email', 'phone', 'address', 'city', 'latitude', 'longitude', 'depositAmount', 'maxCapacity', 'serviceRadiusKm']
const numeric = ['latitude', 'longitude', 'depositAmount', 'commissionRate', 'maxCapacity', 'serviceRadiusKm']
const limits = { businessName: 200, email: 100, phone: 20, taxCode: 20, businessLicense: 2000, openingHours: 1000, address: 500, city: 100, district: 100, slaDocUrl: 500 }

export default function MerchantEditor({ merchant, onClose, onSaved }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('basic'), [mapOpen, setMapOpen] = useState(false)
  const [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState('')
  const locked = useRef(false)
  const images = useImages(5, merchant?.imageUrls || [])
  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm({ resolver: yupResolver(merchantSchema), defaultValues: merchantDefaults(merchant) })
  const submit = async (values) => {
    if (locked.current || uncertain) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      if (merchant && merchantSnapshot(await adminMerchantApi.detail(merchant.id)) !== merchantSnapshot(merchant)) {
        setError('admin.merchants.changed'); return
      }
      const urls = await images.upload()
      const body = merchantPayload(values, merchant, urls)
      if (merchant && JSON.stringify(body) === JSON.stringify(merchantPayload(merchantDefaults(merchant), merchant, merchant.imageUrls || []))) {
        setError('admin.merchants.noChanges'); return
      }
      // Recheck after upload, since it can take time. The server still needs a revision guard.
      if (merchant && merchantSnapshot(await adminMerchantApi.detail(merchant.id)) !== merchantSnapshot(merchant)) {
        setError('admin.merchants.changed'); return
      }
      writing = true
      const saved = await adminMerchantApi[merchant ? 'update' : 'create'](body)
      notify.success(merchant ? 'admin.merchants.updated' : 'admin.merchants.created')
      onSaved(saved)
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      setUncertain(unknown)
      setError(unknown ? 'admin.merchants.uncertain' : getApiError(failure))
      notify.error(unknown ? 'admin.merchants.uncertain' : getApiError(failure))
    } finally {
      locked.current = false; setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !locked.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="max-w-3xl"
      >
        <MerchantDialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Store className="text-primary" />
            {t(merchant ? 'admin.merchants.edit' : 'admin.merchants.create')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {t(merchant ? 'admin.merchants.editHint' : 'admin.merchants.createHint')}
          </DialogDescription>
        </MerchantDialogHeader>
        <form
          noValidate
          className="mt-5 space-y-5"
          onSubmit={(event) => handleSubmit(submit, (invalid) => {
            const key = Object.keys(invalid)[0]
            setTab(Object.keys(fields).find((name) => fields[name].includes(key)) || 'region')
            setError('admin.merchants.invalidFields')
          })(event)}
        >
          <div
            role="tablist"
            aria-label={t('admin.merchants.edit')}
            className="flex gap-3 overflow-x-auto border-b border-border"
          >
            {Object.keys(fields).map((key) => (
              <Button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                variant="ghost"
                disabled={pending || uncertain}
                onClick={() => setTab(key)}
                className={`h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 text-base font-medium hover:bg-transparent dark:hover:bg-transparent ${tab === key ? 'border-b-primary text-primary hover:text-primary' : 'border-b-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {t(`admin.merchants.tabs.${key}`)}
              </Button>
            ))}
          </div>
          <fieldset
            disabled={pending || uncertain}
            className="grid gap-4 sm:grid-cols-2"
          >
            {fields[tab].map((key) => (
              <label
                key={key}
                className={`flex min-w-0 flex-col gap-3 text-sm font-medium ${['businessName', 'businessLicense', 'address', 'slaDocUrl'].includes(key) ? 'sm:col-span-2' : ''}`}
              >
                <span>
                  {t(`admin.merchants.fields.${key}`)}
                  {required.includes(key) && <span className="ml-1 text-destructive">*</span>}
                </span>
                <Input
                  {...register(key)}
                  aria-label={t(`admin.merchants.fields.${key}`)}
                  placeholder={t(`admin.merchants.placeholders.${key}`)}
                  aria-required={required.includes(key)}
                  type={numeric.includes(key) ? 'number' : key.includes('Date') ? 'date' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                  step={numeric.includes(key) ? ['maxCapacity', 'serviceRadiusKm'].includes(key) ? '1' : 'any' : undefined}
                  maxLength={limits[key]}
                  aria-invalid={!!errors[key]}
                  className="h-11 min-w-0 rounded-xl bg-background text-base font-normal placeholder:font-normal"
                />
                {errors[key] && (
                  <span className="text-xs font-normal text-destructive">
                    {t('admin.merchants.invalidField')}
                  </span>
                )}
              </label>
            ))}
            {tab === 'basic' && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
                <h3 className="font-semibold">
                  {t('merchant.shop.images')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('merchant.shop.imagesHint')}
                </p>
                <div className="flex flex-wrap gap-3">
                  {images.images.map((image) => (
                    <div
                      key={image.url}
                      className="relative size-20"
                    >
                      <img
                        src={getImageUrl(image.url)}
                        alt={t('merchant.shop.images')}
                        className="size-full rounded-lg border border-border object-cover"
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
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-3 font-semibold text-primary">
                  <ImagePlus size={18} />
                  {t('merchant.shop.addImages')}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={images.images.length >= 5}
                    onChange={(event) => {
                      images.addFiles(Array.from(event.target.files || [])); event.target.value = ''
                    }}
                  />
                </label>
                {images.error && (
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t(images.error)}
                  </p>
                )}
              </div>
            )}
            {tab === 'contract' && (
              <p className="rounded-xl bg-primary/5 p-4 text-sm leading-6 text-muted-foreground sm:col-span-2">
                {t('admin.merchants.commissionHint')}
              </p>
            )}
            {tab === 'region' && (
              <div className="space-y-3 sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-violet-200 bg-violet-50 px-5 text-base font-medium text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50"
                  onClick={() => setMapOpen(true)}
                >
                  <MapPinned size={18} />
                  {t('customer.addressMap.open')}
                </Button>
                <p className="rounded-xl bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  {t('admin.merchants.areaHint', { count: merchant?.serviceAreaIds?.length || 0 })}
                </p>
              </div>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="text-sm leading-6 text-destructive"
            >
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-5 text-base font-semibold"
              disabled={pending}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              className="h-11 px-6 text-base font-semibold"
              disabled={pending || uncertain || !!images.error}
            >
              <Save size={18} />
              {t(pending ? 'admin.merchants.saving' : 'admin.merchants.save')}
            </Button>
          </div>
        </form>
        {mapOpen && (
          <Suspense fallback={(
            <p role="status">
              {t('customer.addressMap.loading')}
            </p>
          )}
          >
            <AddressPicker
              initialCenter={Number.isFinite(Number(getValues('latitude'))) && Number.isFinite(Number(getValues('longitude'))) && (Number(getValues('latitude')) !== 0 || Number(getValues('longitude')) !== 0) ? { latitude: Number(getValues('latitude')), longitude: Number(getValues('longitude')) } : null}
              onClose={() => setMapOpen(false)}
              onApply={(value) => {
                for (const key of ['address', 'city']) {
                  if (value[key]) {
                    setValue(key, value[key], { shouldDirty: true, shouldValidate: true })
                  }
                } setValue('latitude', value.position.latitude, { shouldDirty: true }); setValue('longitude', value.position.longitude, { shouldDirty: true }); setMapOpen(false)
              }}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  )
}
