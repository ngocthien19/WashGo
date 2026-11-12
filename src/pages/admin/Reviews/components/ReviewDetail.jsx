import ReviewContact from './ReviewContact'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, EyeOff, Eye, ClipboardList, MessageSquareText, Images } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import AuditPanel from '~/pages/admin/Audit/AuditPanel'
import { adminReviewApi } from '~/apis/admin/adminReviewApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { ADMIN_ROUTES } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'
import { canModerate } from '../reviewModel'
import { ReviewScore, ReviewStatus } from './ReviewDisplay'

export default function ReviewDetail({ selected, blocked, onClose, onAction }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(useCallback(signal => adminReviewApi.preview(selected, signal), [selected]))
  const row = resource.data?.row
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-4xl"
        closeLabel="common.close"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Star className="text-primary" />
            {t('admin.reviews.detail')}
          </DialogTitle>
          <DialogDescription className="mt-4 text-base">
            {t('admin.reviews.detailHint')}
          </DialogDescription>
        </DialogHeader>
        {!row ? <ResourceFeedback {...resource} /> : (
          <div className="mt-5 space-y-5">
            {!resource.data.fresh && (
              <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                {t('admin.reviews.readOnlyDetail')}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/15 bg-primary/5 p-5">
              <div className="space-y-2">
                <Link
                  className="text-lg font-semibold text-primary hover:underline"
                  to={`${ADMIN_ROUTES.ORDERS}/${row.orderId}`}
                >
                  {row.orderCode}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(row.createdOn)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <ReviewScore value={row.overallStars} />
                <ReviewStatus hidden={row.isHidden} />
              </div>
            </div>
            <div className="grid items-start gap-5 md:grid-cols-2">
              <section className="overflow-hidden rounded-xl border border-border">
                <h3 className="flex items-center gap-2 border-b border-primary/15 bg-primary/5 p-4 font-semibold">
                  <ClipboardList className="size-5 text-primary" />
                  {t('admin.reviews.internalInfo')}
                </h3>
                <div className="space-y-5 p-5">
                  {[false, true].map(merchant => (
                    <div
                      key={String(merchant)}
                      className="space-y-3"
                    >
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {t(`admin.reviews.${merchant ? 'merchantName' : 'customerName'}`)}
                      </h4>
                      <ReviewContact
                        row={row}
                        merchant={merchant}
                      />
                    </div>
                  ))}
                </div>
              </section>
              <section className="overflow-hidden rounded-xl border border-border">
                <h3 className="flex items-center gap-2 border-b border-primary/15 bg-primary/5 p-4 font-semibold">
                  <Star className="size-5 text-primary" />
                  {t('admin.reviews.criteria')}
                </h3>
                <dl className="space-y-4 p-5">
                  {['qualityStars', 'speedStars', 'attitudeStars', 'packagingStars'].map(key => (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <dt>
                        {t(`admin.reviews.${key}`)}
                      </dt>
                      <dd>
                        {row[key] == null ? '—' : <ReviewScore value={row[key]} />}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
            <section className="overflow-hidden rounded-xl border border-border">
              <h3 className="flex items-center gap-2 border-b border-primary/15 bg-primary/5 p-4 font-semibold">
                <MessageSquareText className="size-5 text-primary" />
                {t('admin.reviews.comment')}
              </h3>
              <p className="whitespace-pre-wrap break-words p-5 text-base leading-7">
                {row.comment || t('admin.reviews.noComment')}
              </p>
            </section>
            <section className="overflow-hidden rounded-xl border border-border">
              <h3 className="flex items-center gap-2 border-b border-primary/15 bg-primary/5 p-4 font-semibold">
                <Images className="size-5 text-primary" />
                {t('admin.reviews.media')}
              </h3>
              <div className="space-y-4 p-5">
                <CustomerImageGallery urls={row.imageUrls || []} />
                <CustomerVideoGallery urls={row.videoUrls || []} />
                {!row.imageUrls?.length && !row.videoUrls?.length && (
                  <p className="text-muted-foreground">
                    {t('admin.reviews.noMedia')}
                  </p>
                )}
              </div>
            </section>
            {row.isHidden && (
              <section className="space-y-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
                <h3 className="font-semibold">
                  {t('admin.reviews.reason')}
                </h3>
                <p className="whitespace-pre-wrap break-words">
                  {row.hiddenReason || '—'}
                </p>
                {row.hiddenAt && (
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(row.hiddenAt)}
                  </p>
                )}
              </section>
            )}
            {resource.data.fresh && row.version && (
              <AuditPanel
                resourceType="OrderRating"
                resourceId={row.id}
                compactFilters
              />
            )}
            <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <Button
                className="h-11 px-6 text-base"
                variant="secondary"
                onClick={onClose}
              >
                {t('common.close')}
              </Button>
              <Button
                className="h-11 px-6 text-base"
                variant={row.isHidden ? 'default' : 'destructive'}
                disabled={blocked || !resource.data.fresh || !canModerate(row, !row.isHidden)}
                onClick={() => onAction(row)}
              >
                {row.isHidden ? <Eye /> : <EyeOff />}
                {t(`admin.reviews.${row.isHidden ? 'show' : 'hide'}`)}
              </Button>
            </footer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
