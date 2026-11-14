import { getImageUrl } from '~/utils/format/formats'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { IMAGE_UPLOAD } from '~/utils/config/constants'

export default function ImagePicker({ selection, disabled, help }) {
  const { t } = useTranslation()
  const input = useRef(null)
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-violet-300/70 bg-violet-500/3 p-4 dark:border-violet-400/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline-violet"
          className="h-11 rounded-xl"
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
        multiple
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
      <p className="text-xs leading-6 text-muted-foreground">
        {help}
      </p>
      <FormError>
        {selection.error}
      </FormError>
      {!!selection.images.length && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {selection.images.map((image, index) => (
            <div
              key={image.url}
              className="relative"
            >
              <img
                src={getImageUrl(image.url)}
                alt={t('customer.imageUpload.alt', { count: index + 1 })}
                className="aspect-square w-full rounded-xl border border-border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={disabled}
                className="absolute right-1 top-1 bg-red-100 text-red-600"
                aria-label={t('customer.imageUpload.remove', { count: index + 1 })}
                onClick={() => selection.removeImage(image)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
