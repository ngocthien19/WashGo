import ReviewContact from './ReviewContact'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, ClipboardList, MessageSquareText, Images } from 'lucide-react'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import { ADMIN_ROUTES } from '~/utils/config/constants'
import { formatDateTime } from '~/utils/format/formats'
import { ReviewScore, ReviewStatus } from './ReviewDisplay'

export default function ReviewContent({ row, fresh }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      {!fresh && (
        <p className="rounded-xl bg-amber-500/10 p-4 text-base">
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
      <p className="text-sm text-muted-foreground">
        {row.contactBasis ? t('admin.reviews.contactCurrent') : ''}
        {' '}
        {row.contactRetrievedAt ? formatDateTime(row.contactRetrievedAt) : ''}
      </p>
      <p className="font-medium">
        {t(row.contentApprovedAt ? 'admin.reviews.published' : 'admin.reviews.unpublished')}
        {' '}
        {row.contentApprovedAt ? formatDateTime(row.contentApprovedAt) : ''}
      </p>
      <p className="font-medium">
        {t(row.publicApprovedAt ? 'admin.reviews.publicApproved' : 'admin.reviews.notPublicApproved')}
        {' '}
        {row.publicApprovedAt ? formatDateTime(row.publicApprovedAt) : ''}
      </p>

    </div>
  )
}
