import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, CheckCircle2, CalendarDays, MessageSquareText, Images, PackageCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { RATING_CONFIG } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'
import RatingStars from './RatingStars'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import RatingForm from './RatingForm'
import Reveal from '~/components/motion/Reveal'

export default function RatingDialog({ order, resource, onClose, onSaved }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const rating = resource.data
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-2xl overflow-hidden p-0 sm:p-0"
        closeLabel="common.close"
      >
        <div className="flex max-h-[85dvh] min-h-0 flex-col">
          <div className="shrink-0 border-b border-border bg-linear-to-r from-amber-500/8 via-card to-card p-5 pr-14 sm:p-6 sm:pr-14">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/15">
                <Star className="size-6 fill-amber-400 text-amber-500" />
              </span>
              {t(rating ? 'customer.rating.viewTitle' : 'customer.rating.title')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
              {t('customer.rating.once')}
            </DialogDescription>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold">
              <PackageCheck className="size-4 text-primary" />
              {order.orderCode}
            </div>
          </div>
          {resource.loading || resource.error ? (
            <div className="overflow-y-auto p-5 sm:p-6">
              <CatalogFeedback
                {...resource}
                loadingText="customer.rating.loading"
              />
            </div>
          ) : rating ? (
            <>
              <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
                <Reveal className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={18} />
                      {t('customer.rating.saved')}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays size={14} />
                      {formatDateTime(rating.createdOn)}
                    </p>
                  </div>
                  {rating.isVisible === false && (
                    <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                      {t('customer.rating.notPublic')}
                    </p>
                  )}
                  <RatingStars
                    featured
                    label={t('customer.rating.overallStars')}
                    value={rating.overallStars}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {RATING_CONFIG.CRITERIA.filter((key) => rating[key] != null).map((key) => (
                      <div
                        key={key}
                        className="rounded-xl border border-border bg-muted/25 p-4"
                      >
                        <RatingStars
                          label={t(`customer.rating.${key}`)}
                          value={rating[key]}
                        />
                      </div>
                    ))}
                  </div>
                  {rating.comment && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <MessageSquareText className="size-4 text-primary" />
                        {t('customer.rating.comment')}
                      </h3>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                        {rating.comment}
                      </p>
                    </div>
                  )}
                  <CustomerVideoGallery urls={rating.videoUrls} />
                  {!!rating.imageUrls?.length && (
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Images className="size-4 text-violet-500" />
                        {t('customer.rating.photos')}
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                          {rating.imageUrls.length}
                        </span>
                      </h3>
                      <CustomerImageGallery urls={rating.imageUrls} />
                    </div>
                  )}
                </Reveal>
              </div>
              <div className="flex shrink-0 justify-end border-t border-border bg-muted/25 px-5 py-4 sm:px-6">
                <Button
                  variant="secondary"
                  className="h-11 rounded-xl px-4"
                  onClick={onClose}
                >
                  {t('common.close')}
                </Button>
              </div>
            </>
          ) : (
            <RatingForm
              orderId={order.id}
              onClose={onClose}
              onBusy={setBusy}
              onSaved={onSaved}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
