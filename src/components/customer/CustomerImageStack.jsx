import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Images } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import CustomerImageGallery from './CustomerImageGallery'
import { getImageUrl } from '~/utils/format/formats'

export default function CustomerImageStack({ urls = [] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!urls.length) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <>
      <Button
        variant="ghost"
        className="h-auto rounded-xl p-1"
        aria-label={t('customer.imageUpload.viewAll', { count: urls.length })}
        tooltip={t('customer.imageUpload.viewAll', { count: urls.length })}
        onClick={() => setOpen(true)}
      >
        <span className="flex -space-x-3">
          {urls.slice(0, 2).map((url) => (
            <img
              key={url}
              src={getImageUrl(url)}
              alt=""
              className="relative size-11 rounded-xl border-2 border-card bg-muted object-cover shadow-sm"
            />
          ))}
          {urls.length > 2 && (
            <span className="relative grid size-11 place-items-center rounded-xl border-2 border-card bg-slate-700 text-xs font-bold text-white shadow-sm dark:bg-slate-600">
              {urls.length - 2}
              +
            </span>
          )}
        </span>
      </Button>
      {open && (
        <Dialog
          open
          onOpenChange={(value) => {
            if (!value) {
              setOpen(false)
            }
          }}
        >
          <DialogContent
            className="max-w-2xl overflow-hidden p-0 sm:p-0"
            closeLabel="common.close"
          >
            <div className="flex max-h-[85dvh] flex-col">
              <div className="shrink-0 border-b border-border p-5 pr-14">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Images className="size-5 text-primary" />
                  {t('customer.imageUpload.galleryTitle')}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {t('customer.imageUpload.viewAll', { count: urls.length })}
                </DialogDescription>
              </div>
              <div className="min-h-0 overflow-y-auto p-5">
                <CustomerImageGallery urls={urls} />
              </div>
              <div className="flex shrink-0 justify-end border-t border-border bg-muted/25 px-5 py-4">
                <Button
                  variant="secondary"
                  className="h-11 rounded-xl px-4"
                  onClick={() => setOpen(false)}
                >
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
