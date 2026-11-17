import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { adminPaymentApi } from '~/apis/admin/adminPaymentApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { ADMIN_ROUTES, PAYMENT_OPTIONS } from '~/utils/config/constants'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'
import FinanceTable from './FinanceTable'

export default function PaymentReconciliations({ revision }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [includeResolved, setIncludeResolved] = useState(false)
  const resource = useCatalogResource(useCallback(signal => adminPaymentApi.reconciliations(page, includeResolved, signal), [page, includeResolved]), revision)
  return (
    <section
      data-pagination-scope
      className="min-w-0 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            checked={includeResolved}
            onCheckedChange={value => {
              setIncludeResolved(!!value); setPage(1)
            }}
          />
          {t('paymentReview.includeResolved')}
        </label>
        <Button
          variant="outline"
          className="h-11"
          disabled={resource.loading}
          onClick={resource.retry}
        >
          <RefreshCw size={16} />
          {t('customer.orders.refresh')}
        </Button>
      </div>
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6">
        {t('paymentReview.hint')}
      </p>
      {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : resource.data && (
        <FinanceTable
          rows={resource.data.list}
          rowKey={row => row.id}
          label="paymentReview.title"
          pagination={{ page, total: resource.data.total, totalPages: resource.data.totalPages, onChange: setPage }}
          columns={[
            { key: 'reference', label: 'paymentReview.reference', className: 'min-w-56 max-w-80', render: row => (
              <div className="break-words">
                <p className="font-semibold">
                  {row.transactionReference}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.providerTransactionId || '—'}
                </p>
              </div>
            ) },
            { key: 'order', label: 'loyalty.order', render: row => (
              <Link
                className="whitespace-nowrap text-primary hover:underline"
                to={`${ADMIN_ROUTES.ORDERS}/${encodeURIComponent(row.orderId)}`}
              >
                {t('customer.orders.details')}
              </Link>
            ) },
            { key: 'amount', label: 'loyalty.gatewayAmount', render: row => formatCurrency(row.amount) },
            { key: 'purpose', label: 'paymentReview.purpose', render: row => t(`paymentReview.purposes.${row.purpose}`) },
            { key: 'method', label: 'customer.payment.method', render: row => t(PAYMENT_OPTIONS.find(option => option.value === row.paymentMethod)?.label || 'common.unknown') },
            { key: 'status', label: 'paymentReview.transactionStatus', render: row => t(`paymentReview.statuses.${row.status}`) },
            { key: 'session', label: 'paymentReview.session', render: row => t(`paymentReview.sessions.${row.sessionState}`) },
            { key: 'reason', label: 'admin.finance.reason', className: 'min-w-60 max-w-96', render: row => (
              <p className="whitespace-pre-wrap break-words">
                {row.reason || '—'}
              </p>
            ) },
            { key: 'verified', label: 'paymentReview.verifiedAt', render: row => formatDateTime(row.gatewayVerifiedAt) },
            { key: 'resolved', label: 'paymentReview.reconciledAt', render: row => formatDateTime(row.reconciledAt) },
            { key: 'refund', label: 'paymentReview.refund', render: row => row.refundRequestId ? (
              <Link
                className="whitespace-nowrap text-primary hover:underline"
                to={`${ADMIN_ROUTES.FINANCE}?tab=refunds&orderId=${encodeURIComponent(row.orderId)}`}
              >
                {t('paymentReview.refund')}
              </Link>
            ) : '—' }
          ]}
        />
      )}
    </section>
  )
}
