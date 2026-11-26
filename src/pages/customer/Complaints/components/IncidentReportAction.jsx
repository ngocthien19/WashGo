import { lazy, Suspense, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import LocalizedMessage from '~/components/LocalizedMessage/LocalizedMessage'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerIncidentApi } from '~/apis/customer/customerIncidentApi'
import { ORDER_STATUSES, CUSTOMER_ROUTES } from '~/utils/config/constants'
const IncidentReportDialog = lazy(() => import('./IncidentReportDialog'))
function EligibleAction({ order, compact }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const load = useCallback(async signal => {
    const eligibility = await customerIncidentApi.eligibility(order.id, signal)
    if (!compact || !eligibility.canReport) {
      return eligibility
    }
    let page = 1
    while (true) {
      const reports = await customerIncidentApi.filter({ keyword: order.orderCode, page, take: 50 }, signal)
      if (reports.list.some(report => report.orderId === order.id)) {
        return { ...eligibility, canReport: false }
      }
      if (page >= reports.totalPages) {
        return eligibility
      }
      page++
    }
  }, [order.id, order.orderCode, compact])
  const resource = useCatalogResource(load)
  const data = resource.data
  if (compact && (resource.loading || resource.error || !data?.canReport || data.pendingIncidentId)) {
    return null
  }
  if (resource.error) {
    return <ResourceFeedback {...resource} />
  }
  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        className={`h-11 rounded-xl px-4 ${compact ? 'shrink-0 text-base' : 'w-full'} text-rose-700 dark:text-rose-300`}
        disabled={resource.loading || !data?.canReport}
        onClick={() => setOpen(true)}
      >
        {!compact && <ShieldAlert size={17} />}
        {t(compact ? 'receiptUi.report' : 'customer.incidents.report')}
      </Button>
      {data && !data.canReport && (
        <p className="text-sm text-muted-foreground">
          <LocalizedMessage message={data.reason || 'customer.sync.notEligible'} />
        </p>
      )}
      {data?.pendingIncidentId && (
        <Link
          className="text-sm font-semibold text-primary underline"
          to={CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', data.pendingIncidentId)}
        >
          {t('customer.incidents.viewMine')}
        </Link>
      )}
      {open && (
        <Suspense fallback={null}>
          <IncidentReportDialog
            order={order}
            eligibility={data}
            onSaved={resource.retry}
            onClose={() => {
              setOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
export default function IncidentReportAction({ order, compact = false }) {
  return order.status === ORDER_STATUSES.COMPLETED ? (
    <EligibleAction
      key={order.id}
      order={order}
      compact={compact}
    />
  ) : null
}
