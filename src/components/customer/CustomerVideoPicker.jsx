import { useTranslation } from 'react-i18next'
import { Video, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { VIDEO_UPLOAD } from '~/utils/media/videos'
import { getImageUrl } from '~/utils/format/formats'
export default function CustomerVideoPicker({ selection, disabled }) {
  const { t } = useTranslation()
  return (
    <section className="grid gap-3 rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Video
          size={18}
          className="text-primary"
        />
        {t('customer.sync.videos')}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t('customer.sync.videoHelp')}
      </p>
      <input
        type="file"
        multiple
        accept={VIDEO_UPLOAD.ACCEPT}
        aria-label={t('customer.sync.videos')}
        disabled={disabled || selection.videos.length >= VIDEO_UPLOAD.MAX_FILES}
        onChange={(event) => {
          selection.addFiles([...event.target.files]); event.target.value = ''
        }}
        className="w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:p-2 file:text-primary"
      />
      {selection.videos.map((item, index) => (
        <div
          key={item.url}
          className="flex min-w-0 items-start gap-2"
        >
          <video
            controls
            preload="metadata"
            playsInline
            src={getImageUrl(item.url)}
            aria-label={t('customer.sync.videoNumber', { number: index + 1 })}
            className="aspect-video min-w-0 flex-1 rounded-xl bg-black"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            disabled={disabled}
            aria-label={t('customer.sync.removeVideo', { number: index + 1 })}
            onClick={() => selection.removeVideo(item)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <FormError>
        {selection.error}
      </FormError>
    </section>
  )
}
