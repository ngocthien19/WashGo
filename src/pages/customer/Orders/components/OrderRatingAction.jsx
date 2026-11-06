import { lazy, Suspense, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, LoaderCircle } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { ORDER_STATUSES } from '~/utils/constants'
import { customerRatingApi } from '~/apis/customer/customerRatingApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'

const RatingDialog = lazy(() => import('./RatingDialog'))

export default function OrderRatingAction({ order }) {
  return order.status === ORDER_STATUSES.COMPLETED ? (
    <CompletedRatingAction
      key={order.id}
      order={order}
    />
  ) : null
}

function CompletedRatingAction({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const load = useCallback((signal) => customerRatingApi.getByOrder(order.id, signal), [order.id])
  const resource = useCatalogResource(load)
  const [saved, setSaved] = useState(null)
  const rating = saved || resource.data
  return (
    <>
      <Button
        className="h-11 w-full bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
        onClick={() => setOpen(true)}
        disabled={resource.loading}
        aria-busy={resource.loading}
      >
        {resource.loading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Star size={16} />}
        {t(resource.loading ? 'customer.rating.loading' : resource.error ? 'customer.rating.checkSaved' : rating ? 'customer.rating.viewTitle' : 'customer.rating.title')}
      </Button>
      {open && (
        <Suspense fallback={(
          <p role="status">
            {t('customer.rating.loading')}
          </p>
        )}
        >
          <RatingDialog
            order={order}
            onClose={() => setOpen(false)}
            resource={{ ...resource, data: rating }}
            onSaved={setSaved}
          />
        </Suspense>
      )}
    </>
  )
}
