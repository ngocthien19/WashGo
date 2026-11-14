import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { ContactRound, LoaderCircle, MapPin, MapPinned, RotateCcw, Save } from 'lucide-react'
import { customerProfileApi } from '~/apis/customer/customerProfileApi'
import { updateCustomerIdentity } from '~/redux/auth/authSlice'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/ui/FormField'
import FormError from '~/components/ui/FormError'
import Reveal from '~/components/motion/Reveal'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { AUTH_LIMITS, PROFILE_LIMITS } from '~/utils/constants'
import { getProfileValues, profileSchema } from '../profileSchema'
import AvatarEditor from './AvatarEditor'
import ProfileStats from './ProfileStats'

const AddressPickerDialog = lazy(() => import('~/components/maps/AddressPickerDialog'))

export default function ProfileEditor({ profile }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [saved, setSaved] = useState(profile)
  const [file, setFile] = useState(null)
  const [removed, setRemoved] = useState(false)
  const [photoRevision, setPhotoRevision] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapCenter, setMapCenter] = useState(null)
  const request = useRef(null)
  const uploaded = useRef(null)
  const saving = useRef(false)
  const { register, handleSubmit, reset, setValue, setError, clearErrors, formState: { errors, isDirty, isSubmitting } } = useForm({
    resolver: yupResolver(profileSchema), defaultValues: getProfileValues(profile)
  })
  const changed = isDirty || !!file || (removed && !!saved.avatarUrl)

  useEffect(() => {
    dispatch(updateCustomerIdentity(profile))
    return () => request.current?.abort()
  }, [dispatch, profile])

  const discard = () => {
    reset(getProfileValues(saved))
    setFile(null)
    setRemoved(false)
    setPhotoRevision((value) => value + 1)
    setMapCenter(null)
    uploaded.current = null
  }

  const save = async (values) => {
    if (saving.current) {
      return
    }
    saving.current = true
    clearErrors('root')
    const controller = new AbortController()
    request.current = controller
    try {
      let avatarUrl = removed ? '' : null
      if (file) {
        if (uploaded.current?.file !== file) {
          const result = await customerProfileApi.uploadAvatar(file, controller.signal)
          if (!result.url) {
            throw new Error('customer.profile.uploadError')
          }
          uploaded.current = { file, url: result.url }
        }
        avatarUrl = uploaded.current.url
      }
      const result = await customerProfileApi.updateProfile({
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        city: values.city,
        avatarUrl
      }, controller.signal)
      if (controller.signal.aborted) {
        return
      }
      setSaved(result)
      reset(getProfileValues(result))
      setFile(null)
      setRemoved(false)
      setPhotoRevision((value) => value + 1)
      uploaded.current = null
      dispatch(updateCustomerIdentity(result))
      notify.success('customer.profile.saved')
    } catch (error) {
      if (!controller.signal.aborted) {
        setError('root', { message: getApiError(error) })
      }
    } finally {
      saving.current = false
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <Reveal className="min-w-0 lg:sticky lg:top-[var(--customer-header-offset)]">
        <AvatarEditor
          key={photoRevision}
          profile={saved}
          file={file}
          removed={removed}
          disabled={isSubmitting}
          onChange={(next, remove) => {
            setFile(next)
            setRemoved(remove)
            uploaded.current = null
            clearErrors('root')
          }}
        />
      </Reveal>
      <div className="min-w-0 space-y-6">
        <Reveal delay={0.04}>
          <ProfileStats profile={saved} />
        </Reveal>
        <Reveal
          delay={0.08}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
        >
          <form
            aria-label={t('customer.profile.formTitle')}
            onSubmit={(event) => handleSubmit(save)(event)}
            noValidate
          >
            <div className="border-b border-border p-5 sm:px-7">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ContactRound className="size-5 text-primary" />
                {t('customer.profile.formTitle')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t('customer.profile.formHint')}
              </p>
            </div>
            <fieldset
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="min-w-0 space-y-3 p-5 text-base [&_input]:text-base [&_label]:text-base [&_p]:text-sm sm:p-7"
            >
              <div className="grid gap-x-5 sm:grid-cols-2">
                <FormField
                  register={register}
                  name="fullName"
                  required
                  label="auth.fullName"
                  error={errors.fullName}
                  maxLength={AUTH_LIMITS.NAME_MAX}
                  autoComplete="name"
                />
                <FormField
                  register={register}
                  name="phone"
                  type="tel"
                  required
                  label="auth.phoneNumber"
                  hint="customer.profile.phoneFormat"
                  error={errors.phone}
                  maxLength={PROFILE_LIMITS.PHONE_DISPLAY_MAX}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-sm font-medium"
                >
                  {t('common.email')}
                </label>
                <Input
                  id="profile-email"
                  value={saved.email}
                  readOnly
                  aria-describedby="profile-email-hint"
                  className="h-12 rounded-lg bg-muted/50 px-3.5 text-muted-foreground"
                />
                <p
                  id="profile-email-hint"
                  className="mt-1.5 text-xs leading-6 text-muted-foreground"
                >
                  {t('customer.profile.emailReadonly')}
                </p>
              </div>
              <div className="border-t border-border pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <MapPin className="size-4 text-primary" />
                    {t('customer.profile.addressSection')}
                  </h3>
                  <Button
                    type="button"
                    variant="outline-violet"
                    className="h-10 rounded-xl px-3 text-base"
                    onClick={() => setMapOpen(true)}
                  >
                    <MapPinned size={16} />
                    {t('customer.addressMap.open')}
                  </Button>
                </div>
                <FormField
                  register={register}
                  name="address"
                  required
                  label="customer.profile.address"
                  hint="customer.profile.addressHint"
                  error={errors.address}
                  maxLength={PROFILE_LIMITS.ADDRESS_MAX}
                  autoComplete="street-address"
                />
                <FormField
                  register={register}
                  name="city"
                  required
                  label="customer.provinceCity"
                  hint="customer.addressMap.currentStructure"
                  error={errors.city}
                  maxLength={PROFILE_LIMITS.AREA_MAX}
                  autoComplete="address-level1"
                />
              </div>
              <FormError>
                {errors.root?.message}
              </FormError>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/20 p-5 sm:px-7">
              <p
                role="status"
                className="text-xs text-muted-foreground"
              >
                {changed ? t('customer.profile.unsaved') : t('customer.profile.upToDate')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting || !changed}
                  onClick={discard}
                  className="h-11 rounded-xl px-4"
                >
                  <RotateCcw size={16} />
                  {t('customer.profile.discard')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !changed}
                  className="h-11 rounded-xl px-5"
                >
                  {isSubmitting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Save size={16} />}
                  {isSubmitting ? t('customer.profile.saving') : t('customer.profile.save')}
                </Button>
              </div>
            </div>
          </form>
        </Reveal>
      </div>
      {mapOpen && (
        <Suspense fallback={(
          <p role="status">
            {t('customer.addressMap.loading')}
          </p>
        )}
        >
          <AddressPickerDialog
            initialCenter={mapCenter}
            onClose={() => setMapOpen(false)}
            onApply={(selected) => {
              for (const field of ['address', 'district', 'city']) {
                setValue(field, selected[field], { shouldDirty: true, shouldValidate: true, shouldTouch: true })
              }
              clearErrors('root')
              setMapCenter(selected.position)
              setMapOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
