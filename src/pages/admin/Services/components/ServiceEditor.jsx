import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Shirt, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { SelectField } from '~/components/ui/select'
import { SERVICE_TYPES } from '~/utils/constants'
import ImagePicker from '~/components/ImagePicker'
import useImages from '~/hooks/useImages'
import { adminServiceApi } from '~/apis/admin/adminServiceApi'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { defaults, payload, serviceSchema, snapshot, unknownWrite } from '../serviceModel'

export default function ServiceEditor({ service, onClose, onSaved }) {
  const { t } = useTranslation()
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(serviceSchema), defaultValues: defaults(service) })
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false)
  const images = useImages(5, service?.imageUrls || [])
  const locked = useRef(false)
  const submit = async values => {
    if (locked.current || blocked) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      if (service && snapshot(await adminServiceApi.service(service.id)) !== snapshot(service) || service && service.canEdit === false) {
        setBlocked(true); throw new Error('admin.services.changed')
      }
      const imageUrls = await images.upload()
      if (service && snapshot(await adminServiceApi.service(service.id)) !== snapshot(service) || service && service.canEdit === false) {
        setBlocked(true); throw new Error('admin.services.changed')
      }
      writing = true
      await adminServiceApi[service ? 'update' : 'create']({ ...payload(values, service), imageUrls })
      notify.success(service ? 'admin.services.updated' : 'admin.services.created'); onSaved()
    } catch (failure) {
      const message = writing && unknownWrite(failure) ? 'admin.services.unknown' : getApiError(failure)
      if (writing && unknownWrite(failure)) {
        setBlocked(true)
      }
      setError(message); notify.error(message)
    } finally {
      locked.current = false; setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !locked.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-3xl"
        closeLabel="common.close"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Shirt className="text-primary" />
            {t(service ? 'admin.services.edit' : 'admin.services.create')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t('admin.services.editorHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="mt-5 space-y-5"
          onSubmit={event => handleSubmit(submit)(event)}
        >
          <fieldset
            disabled={pending || blocked}
            className="grid min-w-0 gap-4 sm:grid-cols-2"
          >
            {['code', 'name', 'unitPrice', 'pricePerKg', 'pricePerItem', 'estimatedDurationHours', 'unit', 'description'].map(key => (
              <label
                key={key}
                className={`grid min-w-0 gap-3 text-sm font-medium ${key === 'description' ? 'sm:col-span-2' : ''}`}
              >
                <span>
                  {t(`admin.services.fields.${key}`)}
                  {['code', 'name', 'unitPrice', 'estimatedDurationHours', 'unit'].includes(key) && <span className="ml-1 text-destructive">*</span>}
                </span>
                <Input
                  {...register(key)}
                  aria-label={t(`admin.services.fields.${key}`)}
                  aria-invalid={!!errors[key]}
                  type={['unitPrice', 'pricePerKg', 'pricePerItem', 'estimatedDurationHours'].includes(key) ? 'number' : 'text'}
                  step={key === 'estimatedDurationHours' ? '1' : '0.01'}
                  placeholder={t(`admin.services.placeholders.${key}`)}
                  maxLength={key === 'code' ? 50 : key === 'name' ? 200 : key === 'unit' ? 20 : key === 'description' ? 2000 : undefined}
                  className="h-11 min-w-0 rounded-xl text-base font-normal"
                />
                {errors[key] && (
                  <span className="text-xs font-normal text-destructive">
                    {t('admin.services.invalidField')}
                  </span>
                )}
              </label>
            ))}
            <label className="grid gap-3 text-sm font-medium">
              <span>
                {t('merchant.services.category')}
              </span>
              <Controller
                name="serviceType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label={t('merchant.services.category')}
                    value={String(field.value)}
                    onValueChange={value => field.onChange(Number(value))}
                    options={SERVICE_TYPES.filter(item => item.value !== '').map(item => ({ value: String(item.value), label: t(item.label) }))}
                  />
                )}
              />
            </label>
          </fieldset>
          <ImagePicker
            selection={images}
            disabled={pending || blocked}
          />
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
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
              type="submit"
              disabled={pending || blocked}
              className="h-11 px-6 text-base"
            >
              <Save size={18} />
              {t(pending ? 'admin.services.saving' : 'admin.services.save')}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
