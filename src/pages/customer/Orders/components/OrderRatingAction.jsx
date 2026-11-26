import Spinner from '~/components/ui/spinner'
import { lazy, Suspense, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { ORDER_STATUSES } from '~/utils/config/constants'
import { customerRatingApi } from '~/apis/customer/customerRatingApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import IncidentReportAction from '~/pages/customer/Complaints/components/IncidentReportAction'

const RatingDialog = lazy(() => import('./RatingDialog'))

export default function OrderRatingAction({ order, compact = false }) {
  return order.status === ORDER_STATUSES.COMPLETED ? (
    <CompletedRatingAction
      key={order.id}
      order={order}
      compact={compact}
    />
  ) : null
}

function CompletedRatingAction({ order, compact }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const load = useCallback((signal) => customerRatingApi.getByOrder(order.id, signal), [order.id])
  const resource = useCatalogResource(load)
  const [saved, setSaved] = useState(null)
  const rating = saved || resource.data
  if (compact && rating && !open) {
    return (
      <IncidentReportAction
        order={order}
        compact
      />
    )
  }
  return (
    <>
      <Button
        className={`h-11 rounded-xl px-4 ${compact ? 'shrink-0 text-base' : 'w-full'} bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25`}
        onClick={() => setOpen(true)}
        disabled={resource.loading}
        aria-busy={resource.loading}
      >
        {!compact && (resource.loading ? (
          <Spinner
            decorative
            className="size-4"
          />
        ) : <Star size={16} />)}
        {t(compact ? 'receiptUi.rate' : resource.error ? 'customer.rating.checkSaved' : rating ? 'customer.rating.viewTitle' : 'customer.rating.title')}
      </Button>
      {open && (
        <Suspense fallback={null}>
          <RatingDialog
            order={order}
            onClose={() => setOpen(false)}
            resource={{ ...resource, data: rating }}
            onSaved={value => {
              setSaved(value)
              if (compact) {
                setOpen(false)
              }
            }}
          />
        </Suspense>
      )}
    </>
  )
}
