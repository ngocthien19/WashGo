import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Trash2, UserRound } from 'lucide-react'
import CustomerAvatar from '~/components/customer/CustomerAvatar/CustomerAvatar'
import FormError from '~/components/ui/FormError'
import { Button } from '~/components/ui/button'
import { IMAGE_UPLOAD } from '~/utils/constants'
import { validateAvatarFile } from '../profileSchema'

export default function AvatarEditor({ profile, file, removed, disabled, onChange }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (file && preview?.file === file) {
      return () => URL.revokeObjectURL(preview.url)
    }
  }, [file, preview])
  const avatar = file && preview?.file === file ? preview.url : removed ? '' : profile.avatarUrl
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="h-24 border-b border-primary/10 bg-gradient-to-br from-primary/20 via-primary/10 to-card" />
      <div className="relative -mt-12 px-6 pb-7 text-center">
        <CustomerAvatar
          avatar={avatar}
          fullName={profile.fullName}
          alt={t('customer.profile.avatarOf', { name: profile.fullName })}
          className="mx-auto size-24 border-4 border-card text-3xl shadow-sm"
        />
        <h2 className="mt-4 break-words text-xl font-bold tracking-tight">
          {profile.fullName}
        </h2>
        <p className="mt-1 break-all text-sm text-muted-foreground">
          {profile.email}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs text-primary">
          <UserRound size={13} />
          {t('customer.customer')}
        </span>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline-primary"
            className="h-10 rounded-xl px-4"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <Camera size={16} />
            {t('customer.profile.changePhoto')}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-10 rounded-xl"
            disabled={disabled || !avatar}
            aria-label={t('customer.profile.removePhoto')}
            onClick={() => {
              setError('')
              onChange(null, true)
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept={IMAGE_UPLOAD.MIME_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label={t('customer.profile.choosePhoto')}
          disabled={disabled}
          onChange={(event) => {
            const selected = event.target.files?.[0]
            event.target.value = ''
            if (!selected) {
              return
            }
            const validationError = validateAvatarFile(selected)
            setError(validationError)
            if (!validationError) {
              setPreview({ file: selected, url: URL.createObjectURL(selected) })
              onChange(selected, false)
            }
          }}
        />
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {t('customer.profile.photoHint')}
        </p>
        <FormError>
          {error}
        </FormError>
      </div>
    </div>
  )
}
