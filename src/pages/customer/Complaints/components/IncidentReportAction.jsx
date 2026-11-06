import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { ORDER_STATUSES } from '~/utils/constants'

const IncidentReportDialog = lazy(() => import('./IncidentReportDialog'))

export default function IncidentReportAction({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (order.status !== ORDER_STATUSES.COMPLETED) {
    return null
  }
  return (
    <>
      <Button
        variant="outline"
        className="h-11 w-full rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300 dark:hover:bg-rose-400/20"
        onClick={() => setOpen(true)}
      >
        <ShieldAlert size={17} />
        {t('customer.incidents.report')}
      </Button>
      {open && (
        <Suspense fallback={(
          <p role="status">
            {t('customer.incidents.loading')}
          </p>
        )}
        >
          <IncidentReportDialog
            order={order}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
