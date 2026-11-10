import { UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { adminProfileSchema } from './profileModel'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import ImagePicker from '~/components/ImagePicker'
import useImages from '~/hooks/useImages'
import { adminWorkspaceApi } from '~/apis/admin/adminWorkspaceApi'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'


export default function ProfileEditor({ user, onClose, onSaved }) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(adminProfileSchema), defaultValues: { fullName: user.fullName, phone: user.phone || '' } })
  const images = useImages(1, user.avatar ? [user.avatar] : [])
  const lock = useRef(false)
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const submit = async values => {
    if (lock.current || blocked || images.error) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    let writing = false
    try {
      const urls = await images.upload()
      const fresh = await adminWorkspaceApi.profile()
      if (fresh.id !== user.id || fresh.version !== user.version) {
        setBlocked(true); setError('admin.workspaceSync.changed'); return
      }
      writing = true
      const avatar = urls[0] || ''
      const body = Object.fromEntries(Object.entries({ ...values, avatar: avatar === (user.avatar || '') ? null : avatar }).filter(([key]) => user.editableFields.includes(key)))
      const saved = await adminWorkspaceApi.saveProfile({ ...body, expectedVersion: user.version }, user.id)
      notify.success('admin.workspaceSync.saved'); onSaved(saved)
    } catch (failure) {
      const unknown = writing && (!failure.response || failure.response.status >= 500)
      setBlocked(unknown || failure.response?.status === 409)
      setError(unknown ? 'admin.workspaceSync.unknown' : failure.response?.status === 409 ? 'admin.workspaceSync.changed' : getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
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
        closeLabel="common.close"
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <UserRound />
            {t('admin.profile.edit')}
          </DialogTitle>
          <DialogDescription className="mt-4 leading-6 text-muted-foreground">
            {t('admin.workspaceSync.profileHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="mt-5 space-y-5"
          onSubmit={event => handleSubmit(submit)(event)}
        >
          <FormError>
            {error}
          </FormError>
          <fieldset
            disabled={busy || blocked}
            className="space-y-4"
          >
            <label className="grid gap-2">
              {t('admin.profile.email')}
              <Input
                value={user.email}
                disabled
                className="h-12 text-base"
              />
            </label>
            {['fullName', 'phone'].map(key => (
              <label
                key={key}
                className="grid gap-2"
              >
                {t(`admin.profile.${key}`)}
                <Input
                  {...register(key)}
                  aria-label={t(`admin.profile.${key}`)}
                  disabled={!user.editableFields.includes(key)}
                  maxLength={key === 'fullName' ? 100 : 10}
                  className="h-12 text-base"
                />
                <FormError>
                  {errors[key]?.message}
                </FormError>
              </label>
            ))}
            {user.editableFields.includes('avatar') && (
              <ImagePicker
                selection={images}
                disabled={busy || blocked}
                help={t('admin.workspaceSync.avatarHint')}
              />
            )}
          </fieldset>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={busy || blocked}
              className="h-11 px-5 text-base"
            >
              {t('admin.workspaceSync.save')}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
