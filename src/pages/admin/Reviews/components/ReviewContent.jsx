import ReviewContact from './ReviewContact'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, ClipboardList, MessageSquareText, Images, Globe, Clock3, EyeOff } from 'lucide-react'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import { ADMIN_ROUTES } from '~/utils/config/constants'
import { formatDateTime } from '~/utils/format/formats'
import { reviewPublication } from '../reviewModel'
import { ReviewScore, ReviewStatus } from './ReviewDisplay'

export default function ReviewContent({ row, fresh }) {
  const { t } = useTranslation()
  const publication = reviewPublication(row)
  const PublicationIcon = publication.label === 'hidden' ? EyeOff : publication.label === 'pendingApproval' ? Clock3 : Globe
  const publicationTone = publication.label === 'approvedPublished' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : publication.label === 'hidden' ? 'border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300' : 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300'
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
          <ReviewStatus row={row} />
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
      <dl className={`rounded-2xl border p-4 ${publicationTone}`}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-current/5">
            <PublicationIcon
              className="size-5"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 space-y-2">
            <dt className="text-sm font-semibold">
              {t(`admin.reviews.${publication.label}`)}
            </dt>
            {publication.date && (
              <dd className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock3
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <time dateTime={publication.date}>
                  {formatDateTime(publication.date)}
                </time>
              </dd>
            )}
          </div>
        </div>
      </dl>

    </div>
  )
}
