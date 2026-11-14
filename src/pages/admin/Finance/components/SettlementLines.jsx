import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { adminFinanceApi } from '~/apis/admin/adminFinanceApi'
import { formatCurrency, formatNumber } from '~/utils/format/formats'
import FinanceTable from './FinanceTable'

export default function SettlementLines({ id, initial }) {
  const { t } = useTranslation(), [page, setPage] = useState(1)
  const load = useCallback(signal => page === 1 && initial ? Promise.resolve(initial) : adminFinanceApi.lines(id, page, signal), [id, page, initial])
  const resource = useCatalogResource(load)
  const data = page === 1 && initial ? initial : resource.data
  return (
    <section
      data-pagination-scope
      className="min-w-0 space-y-4"
    >
      <h2 className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-lg font-semibold">
        {t('admin.sync.settlementLines')}
      </h2>
      {!data ? <ResourceFeedback {...resource} /> : (
        <>
          <p className={`rounded-xl p-4 text-sm ${data.isSnapshot ? 'bg-primary/5 text-muted-foreground' : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}>
            {t(data.isSnapshot ? 'admin.sync.snapshotLines' : 'admin.sync.legacyLines')}
          </p>
          <FinanceTable
            rows={data.list}
            rowKey={row => row.orderId}
            label="admin.finance.orders"
            pagination={{ page, total: data.total, totalPages: Math.ceil(data.total / 12), onChange: setPage }}
            columns={[
              { key: 'order', label: 'admin.complaints.columns.order', render: row => (
                <Link
                  to={`/admin/orders/${row.orderId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {row.orderCode}
                </Link>
              ) },
              ...['collected', 'refunded', 'commission', 'payout'].map(key => ({ key, label: { collected: 'admin.finance.fields.grossRevenue', refunded: 'admin.finance.fields.refundedAmount', commission: 'admin.finance.fields.commissionAmount', payout: 'admin.finance.fields.payoutAmount' }[key], render: row => row[key] == null ? '—' : formatCurrency(row[key]) })),
              { key: 'rate', label: 'merchant.orderView.commissionRate', render: row => row.commissionRate == null ? '—' : `${formatNumber(row.commissionRate)}%` }
            ]}
          />
        </>
      )}
    </section>
  )
}
