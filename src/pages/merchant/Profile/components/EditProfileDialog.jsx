import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { merchantDashboardApi } from '~/apis/merchant/merchantDashboardApi'
import { privateDocumentApi } from '~/apis/privateDocumentApi'
import BusinessLicenseField from '~/components/documents/BusinessLicenseField'
import { lazy, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, ImagePlus, X, PencilLine, Store, MapPin, Phone, Clock, Building2, MapPinned, Hash } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import useImages from '~/hooks/useImages'
import { getImageUrl, hasCoordinates } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { merchantProfileApi } from '~/apis/merchant/merchantProfileApi'

import { displayOpeningHours, merchantProfileSchema, profileSnapshot } from '../profileModel'

const fieldIcons = { businessName: Store, address: MapPin, phone: Phone, openingHours: Clock, city: Building2 }
const AddressPickerDialog = lazy(() => import('~/components/maps/AddressPickerDialog'))

export default function EditProfileDialog({ shop, onClose, onSubmitted }) {
  const { t } = useTranslation()
  const { control, register, setValue, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(merchantProfileSchema(shop.taxCode || '')), defaultValues: { businessName: shop.businessName || '', address: shop.address || '', city: shop.city || '', phone: shop.phone || '', openingHours: displayOpeningHours(shop.openingHours), taxCode: shop.taxCode || '' } })
  const values = useWatch({ control })
  const [license, setLicense] = useState(null)
  const [removeLicense, setRemoveLicense] = useState(false)
  const [documentBusy, setDocumentBusy] = useState(false)
  const currentDocument = shop.documents?.find((document) => document.fileId === shop.businessLicenseDocumentId && document.kind === 1)

  const [mapOpen, setMapOpen] = useState(false)
  const [mapCenter, setMapCenter] = useState(hasCoordinates(shop) && (shop.latitude !== 0 || shop.longitude !== 0) ? { latitude: shop.latitude, longitude: shop.longitude } : null)
  const [existing, setExisting] = useState(shop.imageUrls || [])
  const images = useImages(5 - existing.length)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const locked = useRef(false)
  const submit = async (formValues) => {
    if (locked.current || uncertain || documentBusy) {
      return
    }
    const payload = Object.fromEntries(Object.entries(formValues).map(([key, value]) => [key, value.trim()]))
    const locationChanged = payload.address !== (shop.address || '').trim() || payload.city !== (shop.city || '').trim()
    if (locationChanged && !hasCoordinates(mapCenter)) {
      setError('merchant.sync.chooseLocation')
      return
    }
    const coordinatesChanged = hasCoordinates(mapCenter) && (mapCenter.latitude !== shop.latitude || mapCenter.longitude !== shop.longitude)
    const changed = coordinatesChanged || Object.keys(payload).some((key) => payload[key] !== (key === 'openingHours' ? displayOpeningHours(shop[key]) : shop[key] || '').trim()) || images.images.length || JSON.stringify(existing) !== JSON.stringify(shop.imageUrls || [])
    if (!changed && !license && !removeLicense) {
      setError('merchant.shop.noChanges'); return
    }
    locked.current = true
    setPending(true)
    setError('')
    let submitting = false
    try {
      const current = await merchantDashboardApi.profile()
      if (profileSnapshot(current) !== profileSnapshot(shop) || current.pendingRequest || current.status !== 1) {
        setUncertain(true); setError('merchant.backendSync.profileChanged'); return
      }
      if (license) {
        await privateDocumentApi.read(license.fileId)
      }
      const urls = await images.upload()
      submitting = true
      const request = await merchantProfileApi.requestUpdate({ ...payload, taxCode: payload.taxCode !== (shop.taxCode || '').trim() ? payload.taxCode : undefined, businessLicenseDocumentId: license?.fileId, removeBusinessLicenseDocument: removeLicense || undefined, expectedMerchantVersion: current.version, operationId: crypto.randomUUID(), ...(hasCoordinates(mapCenter) ? mapCenter : {}), openingHours: payload.openingHours || null, imageUrls: [...existing, ...urls] })
      notify.success('merchant.shop.submitted')
      onSubmitted(request)
    } catch (failure) {
      const unknown = submitting && (failure.uncertain || !failure.response || failure.response.status >= 500)
      setUncertain(unknown)
      setError(unknown ? 'merchant.shop.uncertain' : getApiError(failure))
    } finally {
      locked.current = false
      setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !locked.current && !documentBusy) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="max-w-2xl border-primary/15"
      >
        <div className="-mx-6 -mt-6 border-b border-primary/10 bg-gradient-to-br from-primary/10 to-primary/0 px-6 py-6 sm:-mx-8 sm:-mt-8 sm:px-8">
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold text-foreground">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10">
              <PencilLine size={23} />
            </span>
            {t('merchant.shop.edit')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-relaxed text-muted-foreground">
            {t('merchant.shop.approvalNote')}
          </DialogDescription>
        </div>
        <form
          noValidate
          onSubmit={(event) => handleSubmit(submit)(event)}
          className="mt-5 space-y-5"
        >
          <fieldset
            disabled={pending || uncertain || documentBusy}
            className="grid gap-5 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 sm:p-5"
          >
            {['businessName', 'address', 'city', 'phone', 'openingHours'].map((key) => {
              const Icon = fieldIcons[key]
              return (
                <div
                  key={key}
                  className={`space-y-2 text-base font-medium ${key === 'businessName' ? 'sm:col-span-2' : ''}`}
                >
                  <label className="block space-y-2">
                    <span className="flex items-center gap-2">
                      <Icon
                        size={16}
                        className="text-primary"
                      />
                      {t(`merchant.shop.${key}`)}
                      {key !== 'openingHours' && <span className="ml-1 text-destructive">*</span>}
                    </span>
                    <Input
                      {...register(key)}
                      value={values[key]}
                      aria-label={t(`merchant.shop.${key}`)}
                      aria-describedby={key === 'city' ? 'merchant-profile-city-note' : undefined}
                      onChange={(event) => {
                        setValue(key, event.target.value, { shouldDirty: true })
                        if (['address', 'city'].includes(key)) {
                          setMapCenter(null)
                        }
                      }}
                      required={key !== 'openingHours'}
                      maxLength={{ businessName: 200, address: 500, city: 100, phone: 20, openingHours: 1000 }[key]}
                      autoComplete={key === 'address' ? 'street-address' : key === 'city' ? 'address-level1' : undefined}
                      type={key === 'phone' ? 'tel' : 'text'}
                      className="h-12 rounded-xl bg-card text-base shadow-none"
                      placeholder={key === 'openingHours' ? t('merchant.shop.hoursPlaceholder') : key === 'city' ? t('merchant.shop.notUpdated') : undefined}
                    />
                    {errors[key] && (
                      <span
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {t(errors[key].message)}
                      </span>
                    )}
                    {key === 'city' && (
                      <span
                        id="merchant-profile-city-note"
                        className="block text-sm font-normal text-muted-foreground"
                      >
                        {t('merchant.sync.locationApproval')}
                      </span>
                    )}
                  </label>
                  {key === 'address' && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline-violet"
                        className="h-10 rounded-xl px-4 text-base"
                        onClick={() => setMapOpen(true)}
                      >
                        <MapPinned size={17} />
                        {t('customer.addressMap.open')}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
            <section
              aria-labelledby="merchant-profile-legal-title"
              className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:col-span-2 sm:grid-cols-2"
            >
              <h3
                id="merchant-profile-legal-title"
                className="font-semibold sm:col-span-2"
              >
                {t('merchant.shop.legalInfo')}
              </h3>
              <label className="flex flex-col gap-3 text-base font-medium sm:col-span-2">
                <span className="flex items-center gap-2">
                  <Hash
                    size={16}
                    className="text-primary"
                  />
                  {t('merchant.shop.taxCode')}
                </span>
                <Input
                  {...register('taxCode')}
                  aria-label={t('merchant.shop.taxCode')}
                  aria-describedby={errors.taxCode ? 'merchant-tax-error' : undefined}
                  className="h-12 rounded-xl text-base"
                  aria-invalid={!!errors.taxCode}
                />
                {errors.taxCode && (
                  <span
                    id="merchant-tax-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t(errors.taxCode.message)}
                  </span>
                )}
              </label>
              <BusinessLicenseField
                current={currentDocument}
                value={license}
                removed={removeLicense}
                onChange={(value, removed) => {
                  setLicense(value); setRemoveLicense(removed)
                }}
                onBusy={setDocumentBusy}
                disabled={pending || uncertain || documentBusy}
              />
              <p className="text-sm text-muted-foreground sm:col-span-2">
                {t('merchant.backendSync.slaReadOnly')}
              </p>
            </section>
            <div className="space-y-3 rounded-xl border border-primary/15 bg-card p-4 sm:col-span-2">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <ImagePlus size={18} />
                {t('merchant.shop.images')}
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                {t('merchant.shop.imagesHint')}
              </p>
              <div className="flex flex-wrap gap-3">
                {[...existing.map((url) => ({ url: getImageUrl(url), original: url })), ...images.images].map((image) => (
                  <div
                    key={image.url}
                    className="relative size-20 overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={image.url}
                      alt={t('merchant.shop.images')}
                      className="size-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-0 top-0 size-6 rounded-full"
                      aria-label={t('merchant.shop.removeImage')}
                      onClick={() => image.original ? setExisting(existing.filter((url) => url !== image.original)) : images.removeImage(image)}
                    >
                      <X size={13} />
                    </Button>
                  </div>
                ))}
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-primary focus-within:ring-2 focus-within:ring-primary">
                <ImagePlus size={20} />
                {t('merchant.shop.addImages')}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={pending || uncertain || existing.length + images.images.length >= 5}
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
          </fieldset>
          {error && (
            <p
              role="alert"
              className="text-base text-destructive"
            >
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={pending || documentBusy}
              className="h-11 px-5 text-base"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={pending || uncertain || documentBusy || !!images.error}
              className="h-11 px-5 text-base"
            >
              <Send size={17} />
              {t(pending ? 'merchant.shop.sending' : 'merchant.shop.submit')}
            </Button>
          </div>
        </form>
        {mapOpen && (
          <Suspense fallback={(
            <p
              role="status"
              className="mt-4 text-sm text-muted-foreground"
            >
              {t('customer.addressMap.loading')}
            </p>
          )}
          >
            <AddressPickerDialog
              initialCenter={mapCenter}
              onClose={() => setMapOpen(false)}
              onApply={(selected) => {
                setValue('address', selected.address || ''); setValue('city', selected.city || '')
                setMapCenter(selected.position)
                setError('')
                setMapOpen(false)
              }}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  )
}
