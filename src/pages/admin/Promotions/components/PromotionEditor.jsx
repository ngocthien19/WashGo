import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Tags, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import { SelectField } from '~/components/ui/select'
import { adminPromotionApi } from '~/apis/admin/adminPromotionApi'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { defaults, payload, promotionSchema, snapshot, unknownWrite } from '../promotionModel'

export default function PromotionEditor({ value, onClose, onSaved }) {
  const { t } = useTranslation()
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(promotionSchema), defaultValues: defaults(value) })
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const locked = useRef(false)
  const submit = async values => {
    if (locked.current || blocked) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      if (value && snapshot(await adminPromotionApi.detail(value.id)) !== snapshot(value)) {
        setBlocked(true); throw new Error('admin.promotions.changed')
      }
      if (value && (values.usageLimit != null && values.usageLimit < value.usedCount || (value.canChangeCode === false) && values.code !== value.code)) {
        throw new Error('admin.promotions.usedRule')
      }
      writing = true
      await adminPromotionApi[value ? 'update' : 'create'](payload(values, value))
      notify.success(value ? 'admin.promotions.updated' : 'admin.promotions.created'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.promotions.unknown' : getApiError(failure)
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
            <Tags className="text-primary" />
            {t(value ? 'admin.promotions.edit' : 'admin.promotions.create')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t('admin.promotions.editorHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={event => handleSubmit(submit)(event)}
          className="mt-5 space-y-5"
        >
          <fieldset
            disabled={pending || blocked}
            className="grid min-w-0 gap-5 sm:grid-cols-2"
          >
            {['code', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscountAmount', 'usageLimit', 'usageLimitPerCustomer', 'startAt', 'endAt', 'description'].map(key => (
              <label
                key={key}
                className={`grid min-w-0 content-start gap-2 text-sm font-medium ${['description', 'maxDiscountAmount'].includes(key) ? 'sm:col-span-2' : ''}`}
              >
                <span>
                  {t(`admin.promotions.fields.${key}`)}
                  {['code', 'discountValue', 'minOrderAmount', 'startAt', 'endAt'].includes(key) && <span className="ml-1 text-destructive">*</span>}
                </span>
                {key === 'discountType' ? (
                  <Controller
                    name="discountType"
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        label={t('admin.promotions.fields.discountType')}
                        value={String(field.value)}
                        onValueChange={next => field.onChange(Number(next))}
                        options={[1, 2].map(type => ({ value: String(type), label: t(`admin.promotions.types.${type}`) }))}
                      />
                    )}
                  />
                ) : (
                  <Input
                    {...register(key)}
                    aria-label={t(`admin.promotions.fields.${key}`)}
                    aria-invalid={!!errors[key]}
                    readOnly={key === 'code' && (value?.canChangeCode === false)}
                    type={['startAt', 'endAt'].includes(key) ? 'datetime-local' : ['code', 'description'].includes(key) ? 'text' : 'number'}
                    step={['startAt', 'endAt'].includes(key) ? '60' : key.includes('usage') ? '1' : '0.01'}
                    maxLength={key === 'code' ? 50 : key === 'description' ? 500 : undefined}
                    placeholder={t(`admin.promotions.placeholders.${key}`)}
                    className="h-11 min-w-0 rounded-xl text-base font-normal [color-scheme:light] dark:[color-scheme:dark]"
                  />
                )}
                {errors[key] && (
                  <span
                    role="alert"
                    className="text-sm font-normal text-destructive"
                  >
                    {t('admin.promotions.invalidField')}
                  </span>
                )}
              </label>
            ))}
            {!value && (
              <label className="flex items-center gap-3 text-base">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                {t('admin.promotions.fields.isActive')}
              </label>
            )}
          </fieldset>
          {value && (
            <p className="text-sm text-muted-foreground">
              {t('admin.promotions.usedRule')}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
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
              className="h-11 px-5 text-base"
            >
              <Save size={18} />
              {t(pending ? 'merchant.saving' : 'admin.promotions.save')}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
