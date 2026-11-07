import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Send, FilePenLine, ImagePlus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { SelectField } from '~/components/ui/select'
import useImages from '~/hooks/useImages'
import { SERVICE_TYPES } from '~/utils/constants'
import { merchantServiceApi } from '~/apis/merchant/merchantServiceApi'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { resolveMessage } from '~/i18n/messages'
import { getImageUrl } from '~/utils/formats'
import { proposalSchema, serviceSnapshot, proposalBlockedMessage } from '../serviceModel'

export default function ProposalEditor({ service, onClose, onSaved }) {
  const { t } = useTranslation()
  const edit = Boolean(service)
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(proposalSchema), defaultValues: { name: service?.name || '', description: service?.description || '', unitPrice: service?.unitPrice ?? '', pricePerKg: service?.pricePerKg ?? '', pricePerItem: service?.pricePerItem ?? '', estimatedDurationHours: service?.estimatedDurationHours ?? 24, serviceType: service?.serviceType || 1, unit: service?.unit || 'kg', reason: '' } })
  const images = useImages(5, service?.imageUrls || [])
  const [pending, setPending] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const intent = useRef(null)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const submit = async (values) => {
    if (lock.current || uncertain && !canRetry) {
      return
    }
    lock.current = true
    setPending(true)
    setError('')
    let writing = false
    try {
      if (edit && !intent.current) {
        const latest = await merchantServiceApi.service(service.id)
        if (!service.version || serviceSnapshot(latest) !== serviceSnapshot(service)) {
          setUncertain(true); setError('merchant.services.changed'); return
        }
        if (latest.canProposeUpdate !== true) {
          setUncertain(true); setError(proposalBlockedMessage(latest)); return
        }
      }
      if (!intent.current) {
        const unchangedImages = edit && JSON.stringify(images.images.map((item) => item.url)) === JSON.stringify(service.imageUrls || [])
        const imageUrls = unchangedImages ? null : await images.upload()
        intent.current = { ...values, description: values.description || null, reason: values.reason || null, imageUrls, expectedVersion: edit ? service.version : undefined, clientRequestId: crypto.randomUUID() }
      }
      writing = true
      const result = await merchantServiceApi.submit(service?.id, intent.current)
      notify.success(result.status === 1 ? 'merchant.services.submitted' : 'merchant.serviceSync.recovered')
      onSaved()
    } catch (failure) {
      const unknown = writing && (failure.uncertain || !failure.response || failure.response.status >= 500)
      const code = failure.response?.data?.meta?.code
      const blocked = failure.response?.status === 409 || code === 'PendingProposal'
      setUncertain(Boolean(unknown || blocked))
      setCanRetry(Boolean(unknown))
      if (!unknown && !blocked) {
        intent.current = null
      }
      const knownCode = ['DuplicateName', 'PendingProposal', 'StaleVersion', 'InvalidPrice', 'MerchantInactive', 'ClientRequestIdReused'].includes(code)
      setError(knownCode ? `merchant.serviceSync.errors.${code}` : unknown ? 'merchant.serviceSync.uncertain' : getApiError(failure))
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
      <DialogContent
        className="max-w-3xl border-primary/15"
        closeLabel="common.close"
      >
        <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FilePenLine size={23} />
          </span>
          {t(edit ? 'merchant.services.proposeEdit' : 'merchant.services.proposeNew')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-base leading-relaxed text-muted-foreground">
          {t('merchant.services.approvalHint')}
        </DialogDescription>
        <form
          onSubmit={(event) => handleSubmit(submit)(event)}
          className="mt-5 grid gap-5"
          noValidate
        >
          <fieldset
            disabled={pending || uncertain}
            className="grid gap-4 sm:grid-cols-2"
          >
            {['name', 'unitPrice', 'estimatedDurationHours', 'pricePerKg', 'pricePerItem', 'unit'].map((key) => (
              <div
                key={key}
                className={key === 'name' ? 'sm:col-span-2' : ''}
              >
                <label
                  htmlFor={`service-${key}`}
                  className="mb-2 block text-base font-medium"
                >
                  {t(`merchant.services.${key === 'estimatedDurationHours' ? 'duration' : key}`)}
                  {['name', 'unitPrice', 'estimatedDurationHours', 'unit'].includes(key) && <span className="ml-1 text-destructive">*</span>}
                </label>
                <Input
                  id={`service-${key}`}
                  {...register(key)}
                  type={['name', 'unit'].includes(key) ? 'text' : 'number'}
                  step={key === 'estimatedDurationHours' ? '1' : '0.01'}
                  readOnly={edit && key === 'unit'}
                  placeholder={t(`merchant.services.placeholders.${key}`)}
                  className="h-11 text-base"
                  aria-invalid={Boolean(errors[key])}
                />
                {errors[key] && (
                  <p
                    role="alert"
                    className="mt-1 text-sm text-destructive"
                  >
                    {t(['unitPrice', 'pricePerKg', 'pricePerItem'].includes(key) ? 'merchant.serviceSync.errors.InvalidPrice' : `merchant.services.invalid.${key}`)}
                  </p>
                )}
              </div>
            ))}
            <div>
              <label
                htmlFor="service-category"
                className="mb-2 block text-base font-medium"
              >
                {t('merchant.services.category')}
                <span className="ml-1 text-destructive">*</span>
              </label>
              <Controller
                name="serviceType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    id="service-category"
                    label={t('merchant.services.category')}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={edit || pending || uncertain}
                    options={SERVICE_TYPES.filter((item) => item.value).map((item) => ({ value: Number(item.value), label: t(item.label) }))}
                  />
                )}
              />
            </div>
            {['description', 'reason'].map((key) => (
              <div
                key={key}
                className="sm:col-span-2"
              >
                <label
                  htmlFor={`service-${key}`}
                  className="mb-2 block text-base font-medium"
                >
                  {t(`merchant.services.${key}`)}
                </label>
                <textarea
                  id={`service-${key}`}
                  {...register(key)}
                  rows={3}
                  maxLength={key === 'reason' ? 1000 : 2000}
                  placeholder={t(`merchant.services.placeholders.${key}`)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-invalid={Boolean(errors[key])}
                />
                {errors[key] && (
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t(`merchant.services.invalid.${key}`)}
                  </p>
                )}
              </div>
            ))}
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:col-span-2">
              <label
                htmlFor="service-images"
                className="flex items-center gap-2 font-semibold"
              >
                <ImagePlus
                  size={19}
                  className="text-primary"
                />
                {t('merchant.services.images')}
              </label>
              <p className="text-sm text-muted-foreground">
                {t('merchant.shop.imagesHint')}
              </p>
              <Input
                id="service-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="h-auto py-2 text-base"
                onChange={(event) => {
                  images.addFiles(Array.from(event.target.files || [])); event.target.value = ''
                }}
              />
              <div className="flex flex-wrap gap-3">
                {images.images.map((image, index) => (
                  <div
                    key={image.url}
                    className="relative"
                  >
                    <img
                      src={getImageUrl(image.url)}
                      alt={t('merchant.services.image', { number: index + 1 })}
                      className="size-20 rounded-xl object-cover"
                    />
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="destructive"
                      aria-label={t('merchant.services.removeImage')}
                      className="absolute -right-2 -top-2"
                      onClick={() => images.removeImage(image)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
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
              className="rounded-xl bg-destructive/10 p-4 text-base text-destructive"
            >
              {resolveMessage(error)}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onClose}
              className="h-11 px-5 text-base font-semibold"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={pending || uncertain && !canRetry}
              className="h-11 px-5 text-base font-semibold"
            >
              <Send size={17} />
              {t(pending ? 'merchant.services.sending' : canRetry ? 'merchant.serviceSync.retry' : 'merchant.services.send')}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
