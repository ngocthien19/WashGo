import { lazy, Suspense, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import LocalizedMessage from '~/components/LocalizedMessage/LocalizedMessage'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerIncidentApi } from '~/apis/customer/customerIncidentApi'
import { ORDER_STATUSES, CUSTOMER_ROUTES } from '~/utils/constants'
const IncidentReportDialog = lazy(() => import('./IncidentReportDialog'))
function EligibleAction({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const load = useCallback((signal) => customerIncidentApi.eligibility(order.id, signal), [order.id])
  const resource = useCatalogResource(load)
  const data = resource.data
  if (resource.error) {
    return <ResourceFeedback {...resource} />
  }
  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        className="h-11 w-full text-rose-700 dark:text-rose-300"
        disabled={resource.loading || !data?.canReport}
        onClick={() => setOpen(true)}
      >
        <ShieldAlert size={17} />
        {t('customer.incidents.report')}
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
        <Suspense fallback={(
          <p role="status">
            {t('customer.incidents.loading')}
          </p>
        )}
        >
          <IncidentReportDialog
            order={order}
            eligibility={data}
            onClose={() => {
              setOpen(false); resource.retry()
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
export default function IncidentReportAction({ order }) {
  return order.status === ORDER_STATUSES.COMPLETED ? (
    <EligibleAction
      key={order.id}
      order={order}
    />
  ) : null
}
