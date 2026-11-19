import ResourceImage from '~/components/ResourceThumbnail/ResourceImage'
import { getImageUrl } from '~/utils/format/formats'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { IMAGE_UPLOAD } from '~/utils/config/constants'
import { cn } from '~/lib/utils'

export default function ImagePicker({ selection, disabled, help, title }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const RemoveIcon = title ? X : Trash2
  const previews = !!selection.images.length && (
    <div className={title ? 'flex flex-wrap gap-3' : 'grid grid-cols-3 gap-3 sm:grid-cols-5'}>
      {selection.images.map((image, index) => (
        <div
          key={image.url}
          className={cn('relative', title && 'size-20')}
        >
          <ResourceImage
            src={getImageUrl(image.url)}
            alt={title || t('customer.imageUpload.alt', { count: index + 1 })}
            className={cn('aspect-square w-full border border-border object-cover', title ? 'rounded-lg' : 'rounded-xl')}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            disabled={disabled}
            className={title ? 'absolute -right-1 -top-1 size-7' : 'absolute right-1 top-1 bg-red-100 text-red-600'}
            aria-label={t('customer.imageUpload.remove', { count: index + 1 })}
            onClick={() => selection.removeImage(image)}
          >
            <RemoveIcon size={14} />
          </Button>
        </div>
      ))}
    </div>
  )
  return (
    <div className={title ? 'space-y-4 rounded-xl border border-border p-4' : 'space-y-3 rounded-2xl border border-dashed border-violet-300/70 bg-violet-500/3 p-4 dark:border-violet-400/30'}>
      {title && (
        <h3 className="border-b border-border pb-3 text-base font-semibold">
          {title}
        </h3>
      )}
      {title && previews}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant={title ? 'ghost' : 'outline-violet'}
          className={cn('h-11 rounded-xl px-4 text-base', title && 'border border-dashed border-primary/40 bg-transparent text-primary hover:border-primary/70 hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10')}
          onClick={() => input.current?.click()}
          disabled={disabled || selection.images.length >= selection.maxImages}
        >
          <ImagePlus size={16} />
          {t('customer.imageUpload.add')}
        </Button>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {selection.images.length}
          {' '}
          /
          {' '}
          {selection.maxImages}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        multiple={selection.maxImages > 1}
        accept={IMAGE_UPLOAD.MIME_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        aria-label={t('customer.imageUpload.add')}
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          event.target.value = ''
          selection.addFiles(files)
        }}
      />
      {help && (
        <p className="text-xs leading-6 text-muted-foreground">
          {help}
        </p>
      )}
      <FormError>
        {selection.error}
      </FormError>
      {!title && previews}
    </div>
  )
}
