import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, EyeOff, RefreshCw, Star } from 'lucide-react'
import { adminReviewApi } from '~/apis/admin/adminReviewApi'
import AuditPanel from '~/pages/admin/Audit/AuditPanel'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { Button } from '~/components/ui/button'
import DetailTabs from '~/components/DetailTabs'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { ADMIN_ROUTES } from '~/utils/constants'
import { canModerate, canPublishReview, readReviewQuery, writeReviewQuery } from './reviewModel'
import ReviewContent from './components/ReviewContent'
import ReviewActionDialog from './components/ReviewActionDialog'
import useReviewOperation, { reviewSnapshot } from './useReviewOperation'

function ReviewPage({ id }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'activity' ? 'activity' : 'content'
  const selected = reviewSnapshot(id)
  const [action, setAction] = useState(null), [revision, setRevision] = useState(0)
  const [unresolved, setUnresolved] = useReviewOperation()
  const resource = useCatalogResource(useCallback(async signal => {
    if (!isId(id)) {
      throw new Error('admin.invalidResponse')
    }
    return selected ? adminReviewApi.preview(selected, signal) : { row: await adminReviewApi.detail(id, signal), fresh: true }
  }, [id, selected]), revision)
  const row = resource.data?.row, fresh = resource.data?.fresh && !resource.loading && !resource.error
  const backQuery = new URLSearchParams(writeReviewQuery(readReviewQuery(new URLSearchParams(location.state?.returnSearch || '')))).toString()
  useEffect(() => {
    document.title = `${t('admin.reviews.detail')} | WashGo`
  }, [t])
  const saved = () => {
    setRevision(value => value + 1)
  }
  return (
    <div className="mx-auto max-w-[1500px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <Button
            className="h-11"
            variant="outline"
            render={<Link to={`${ADMIN_ROUTES.REVIEWS}${backQuery ? `?${backQuery}` : ''}`} />}
            nativeButton={false}
          >
            <ArrowLeft />
            {t('admin.reviews.back')}
          </Button>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Star className="text-primary" />
            {t('admin.reviews.detail')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.reviews.detailHint')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            className="h-11"
            variant="outline"
            disabled={resource.loading}
            onClick={resource.retry}
          >
            <RefreshCw />
            {t('customer.orders.refresh')}
          </Button>
          {row && (
            <>
              <Button
                className="h-11"
                disabled={!!unresolved || !fresh || !canPublishReview(row)}
                onClick={() => setAction({ rows: [row], initialAction: 'Publish' })}
              >
                {t('admin.reviews.publish')}
              </Button>
              <Button
                className="h-11"
                variant={row.isHidden ? 'default' : 'destructive'}
                disabled={!!unresolved || !fresh || !canModerate(row, !row.isHidden)}
                onClick={() => setAction({ rows: [row] })}
              >
                {row.isHidden ? <Eye /> : <EyeOff />}
                {t(row.isHidden ? 'admin.reviews.show' : 'admin.reviews.hide')}
              </Button>
            </>
          )}
        </div>
      </header>
      {unresolved && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"
        >
          <p>
            {t('admin.reviews.unknown')}
          </p>
          <Button
            variant="outline"
            onClick={() => setAction(unresolved)}
          >
            {t('admin.sync.checkResult')}
          </Button>
        </div>
      )}
      {resource.loading || resource.error || !row ? <ResourceFeedback {...resource} /> : (
        <DetailTabs
          label={t('admin.reviews.detail')}
          value={tab}
          onChange={value => setParams(value === 'activity' ? { tab: 'activity' } : {}, { state: location.state })}
          tabs={[{ value: 'content', label: t('admin.reviews.contentTab') }, { value: 'activity', label: t('admin.reviews.activityTab') }]}
        >
          {tab === 'content' ? (
            <ReviewContent
              row={row}
              fresh={resource.data.fresh}
            />
          ) : resource.data.fresh && row.version ? (
            <AuditPanel
              resourceType="OrderRating"
              resourceId={row.id}
              resourceCode={row.orderCode}
              compactFilters
              tableView
              autoApply
              revision={revision}
            />
          ) : (
            <p className="rounded-xl bg-muted p-5">
              {t('admin.reviews.readOnlyDetail')}
            </p>
          )}
        </DetailTabs>
      )}
      {action && (
        <ReviewActionDialog
          {...action}
          onClose={() => setAction(null)}
          onSaved={saved}
          onUnknown={setUnresolved}
          onResolved={() => setUnresolved(null)}
        />
      )}
    </div>
  )
}
export default function ReviewDetailPage() {
  const { reviewId } = useParams()
  return (
    <ReviewPage
      key={reviewId}
      id={reviewId}
    />
  )
}
