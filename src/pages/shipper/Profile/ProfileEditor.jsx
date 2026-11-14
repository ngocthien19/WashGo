import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { UserRound, Save, Mail, Phone, Truck, Bike, Camera } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { SelectField } from '~/components/ui/select'
import FormError from '~/components/ui/FormError'
import CustomerImagePicker from '~/components/customer/CustomerImagePicker'
import useImages from '~/hooks/useImages'
import { shipperWorkspaceApi } from '~/apis/shipper/shipperWorkspaceApi'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'
import { profileSchema, profileSnapshot, profilePayload } from './profileModel'

export default function ProfileEditor({ profile, onClose, onSaved }) {
  const { t } = useTranslation()
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(profileSchema), defaultValues: { fullName: profile.fullName, phone: profile.phone || '', vehicleType: profile.vehicleType, vehiclePlate: profile.vehiclePlate || '' } })
  const avatar = useImages(1, profile.avatarUrl ? [profile.avatarUrl] : [])
  const [pending, setPending] = useState(false)
  const [blocked, setBlocked] = useState(shipperWorkspaceApi.hasPendingProfile(profile.id))
  const [error, setError] = useState('')
  const lock = useRef(false), operation = useRef(null)
  const [unknown, setUnknown] = useState(shipperWorkspaceApi.hasPendingProfile(profile.id))
  const check = async () => {
    if (lock.current) {
      return
    }
    lock.current = true; setPending(true)
    try {
      const result = await shipperWorkspaceApi.checkProfile(profile.id); if (result.id !== profile.id) {
        throw new Error('shipper.invalidResponse')
      } onSaved(result)
    } catch (failure) {
      setError(getApiError(failure))
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const submit = async (values) => {
    if (lock.current || blocked || avatar.error) {
      return
    }
    lock.current = true
    setPending(true)
    setError('')
    let writing = false
    try {
      if (profileSnapshot(await shipperWorkspaceApi.profile()) !== profileSnapshot(profile)) {
        setBlocked(true); setError('shipper.changed'); return
      }
      const urls = await avatar.upload()
      if (profileSnapshot(await shipperWorkspaceApi.profile()) !== profileSnapshot(profile)) {
        setBlocked(true); setError('shipper.changed'); return
      }
      const currentAvatar = urls[0] || ''
      writing = true
      operation.current = crypto.randomUUID()
      const result = await shipperWorkspaceApi.updateProfile({ id: profile.id, ...profilePayload(values, currentAvatar === (profile.avatarUrl || '') ? null : currentAvatar), expectedRevision: profile.revision, operationId: operation.current })
      if (result.id !== profile.id) {
        throw new Error('shipper.invalidResponse')
      }
      notify.success('shipper.saved')
      onSaved(result)
    } catch (failure) {
      const unknown = writing && (!failure.response || failure.response.status >= 500)
      setUnknown(unknown); setBlocked(unknown || failure.response?.status === 409)
      setError(unknown ? 'shipper.unknown' : getApiError(failure))
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
            <UserRound />
            {t('shipper.edit')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            {t('shipper.editHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => handleSubmit(submit)(event)}
          className="mt-5 space-y-5"
        >
          <FormError>
            {error}
          </FormError>
          {unknown && (
            <Button
              type="button"
              onClick={check}
              disabled={pending}
            >
              {t('admin.sync.checkResult')}
            </Button>
          )}
          <fieldset
            disabled={pending || blocked}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="shipper-email"
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                >
                  <Mail
                    size={17}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {t('merchant.shippers.email')}
                </label>
                <Input
                  id="shipper-email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="h-12 bg-muted/40 text-base disabled:opacity-100"
                />
              </div>
              {[['fullName', UserRound], ['phone', Phone], ['vehiclePlate', Truck]].map(([key, Icon]) => (
                <div key={key}>
                  <label
                    htmlFor={`shipper-${key}`}
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <Icon
                      size={17}
                      className="shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {t(`merchant.shippers.${key}`)}
                  </label>
                  <Input
                    id={`shipper-${key}`}
                    {...register(key)}
                    className="h-12 text-base"
                    aria-invalid={!!errors[key]}
                    aria-describedby={errors[key] ? `shipper-${key}-error` : undefined}
                  />
                  {errors[key] && (
                    <p
                      id={`shipper-${key}-error`}
                      role="alert"
                      className="mt-1 text-sm text-destructive"
                    >
                      {t(`shipper.validation.${key}`)}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label
                  htmlFor="shipper-vehicle"
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                >
                  <Bike
                    size={17}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {t('merchant.shippers.vehicleType')}
                </label>
                <Controller
                  name="vehicleType"
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      id="shipper-vehicle"
                      label={t('merchant.shippers.vehicleType')}
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[1, 2, 3].map((value) => ({ value, label: t(`merchant.shippers.vehicles.${value}`) }))}
                      disabled={pending || blocked}
                      className="h-12 text-base"
                    />
                  )}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Camera
                  size={17}
                  className="shrink-0 text-primary"
                  aria-hidden="true"
                />
                {t('shipper.avatar')}
              </p>
              <CustomerImagePicker
                selection={avatar}
                disabled={pending || blocked}
                help={t('shipper.avatarHint')}
              />
            </div>
          </fieldset>
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onClose}
              className="h-12 px-6 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={pending || blocked || !!avatar.error}
              className="h-12 px-6 text-base"
            >
              <Save size={17} />
              {t(pending ? 'merchant.shippers.saving' : 'shipper.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
