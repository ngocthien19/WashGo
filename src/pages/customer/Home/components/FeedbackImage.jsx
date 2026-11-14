import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff } from 'lucide-react'
import { customerReviewApi } from '~/apis/customer/customerReviewApi'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'

export default function FeedbackImage({ reviewId, path, index }) {
  const { t } = useTranslation()
  const [source, setSource] = useState(null), [error, setError] = useState(false), [open, setOpen] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let url
    customerReviewApi.image(reviewId, path, controller.signal).then(blob => {
      if (!controller.signal.aborted) {
        url = URL.createObjectURL(blob); setSource(url)
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setError(true)
      }
    })
    return () => {
      controller.abort()
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [reviewId, path])
  const label = t('catalogUi.photo', { number: index + 1 })
  return (
    <>
      <Button
        variant="outline"
        className="size-16 shrink-0 overflow-hidden rounded-xl p-0"
        disabled={!source}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        {source ? (
          <img
            src={source}
            alt={label}
            className="size-full object-cover"
          />
        ) : error ? <ImageOff className="text-muted-foreground" /> : <span className="size-full animate-pulse bg-muted motion-reduce:animate-none" />}
      </Button>
      {open && source && (
        <Dialog
          open
          onOpenChange={setOpen}
        >
          <DialogContent
            closeLabel="common.close"
            className="max-w-3xl"
          >
            <DialogTitle>
              {label}
            </DialogTitle>
            <img
              src={source}
              alt={label}
              className="mt-4 max-h-[70dvh] w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
