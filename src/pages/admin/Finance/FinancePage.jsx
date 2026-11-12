import CommissionReview from './components/CommissionReview'
import FinanceFilters from './components/FinanceFilters'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wallet, RefreshCw, Download, Plus, MoreHorizontal, Eye, Check, X, Banknote, Undo2, Shirt, TrendingUp } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import StatCard from '~/components/workspace/StatCard'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import Reveal from '~/components/motion/Reveal'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminFinanceApi } from '~/apis/admin/adminFinanceApi'
import { ADMIN_ROUTES } from '~/utils/constants'
import { formatCurrency, formatNumber, formatDateTime } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import RevenueChart from '~/pages/admin/Home/RevenueChart'
import { readQuery, writeQuery, periodFilter, settlementFilter, tabs, statusClass } from './financeModel'
import FinanceTable from './components/FinanceTable'
import SettlementEditor from './components/SettlementEditor'
import FinanceRecordDialog from './components/FinanceRecordDialog'

export default function FinancePage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams(), [modal, setModal] = useState(null), [exporting, setExporting] = useState(false)
  const exportLock = useRef(false)
  const query = useMemo(() => readQuery(params), [params])
  const load = useCallback(signal => query.tab === 'commissionReview' ? Promise.resolve({}) : query.tab === 'settlements' ? adminFinanceApi.settlements(settlementFilter(query), signal) : query.tab === 'refunds' ? adminFinanceApi.refunds(settlementFilter(query), signal) : adminFinanceApi[query.tab](periodFilter(query), signal), [query])
  const resource = useCatalogResource(load), merchants = useCatalogResource(adminFinanceApi.merchants)
  const update = patch => setParams(writeQuery({ ...query, ...patch, page: patch.page || 1 }))
  const rowMerchant = row => merchants.data?.find(item => item.id === row.merchantId)
  const merchantCell = row => (
    <div className="flex items-center gap-3">
      <ResourceThumbnail
        name={row.merchantName}
        urls={rowMerchant(row)?.imageUrls}
      />
      <span className="font-semibold">
        {row.merchantName}
      </span>
    </div>
  )
  const moneyColumn = key => ({ key, label: `admin.finance.fields.${key}`, className: 'min-w-44 whitespace-nowrap', render: row => (
    <span className={key === 'payoutAmount' ? 'font-semibold text-primary' : 'font-medium'}>
      {row.commissionComplete === false && ['commissionAmount', 'payoutAmount'].includes(key) ? '—' : formatCurrency(row[key])}
    </span>
  ) })
  const actionMenu = (row, refund = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={(
        <Button
          size="icon"
          variant="secondary"
          className="size-10 rounded-xl"
          aria-label={t('admin.finance.actionsFor', { name: refund ? row.orderCode || t('admin.finance.refund') : row.merchantName })}
        />
      )}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setModal({ kind: refund ? 'refundDetail' : 'settlementDetail', value: row })}>
          <Eye size={16} />
          {t('admin.finance.detail')}
        </DropdownMenuItem>
        {(refund ? row.status === 1 : row.status === 1 && row.payoutAmount > 0) && (
          <DropdownMenuItem onClick={() => setModal({ kind: refund ? 'approve' : 'pay', value: row })}>
            <Check size={16} />
            {t(refund ? 'admin.finance.approve' : 'admin.finance.pay')}
          </DropdownMenuItem>
        )}
        {refund && row.status === 1 && (
          <DropdownMenuItem
            onClick={() => setModal({ kind: 'reject', value: row })}
            className="text-destructive"
          >
            <X size={16} />
            {t('admin.finance.reject')}
          </DropdownMenuItem>
        )}
        {refund && row.status === 2 && (
          <DropdownMenuItem onClick={() => setModal({ kind: 'confirmRefund', value: row })}>
            <Undo2 size={16} />
            {t('admin.finance.confirmRefund')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const download = async () => {
    if (exportLock.current) {
      return
    }
    exportLock.current = true; setExporting(true)
    try {
      const blob = await adminFinanceApi.export({ ...periodFilter(query), asOf: Math.floor(Date.parse(resource.data.asOf || resource.data.generatedAt) / 1000) }), url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `washgo-finance-${query.from}-${query.to}.csv`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify.success('admin.finance.exported')
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      exportLock.current = false; setExporting(false)
    }
  }
  useEffect(() => {
    document.title = `${t('admin.nav.finance')} | WashGo`
  }, [t])
  const report = query.tab === 'revenue' ? resource.data : null
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Wallet className="text-primary" />
            {t('admin.nav.finance')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('admin.finance.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={resource.retry}
            disabled={resource.loading || exporting}
            className="h-11 px-5 text-base"
          >
            <RefreshCw size={18} />
            {t('customer.orders.refresh')}
          </Button>
          {query.tab === 'revenue' && (
            <Button
              variant="outline"
              disabled={!report || resource.loading || exporting}
              onClick={download}
              className="h-11 border-emerald-200 bg-emerald-50 px-5 text-base text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <Download size={18} />
              {t(exporting ? 'admin.promotions.exporting' : 'admin.promotions.export')}
            </Button>
          )}
          {query.tab === 'settlements' && (
            <Button
              onClick={() => setModal({ kind: 'create' })}
              className="h-11 px-5 text-base"
            >
              <Plus size={18} />
              {t('admin.finance.create')}
            </Button>
          )}
        </div>
      </header>
      <div
        role="tablist"
        aria-label={t('admin.nav.finance')}
        className="flex gap-4 overflow-x-auto border-b border-border"
      >
        {tabs.map(tab => (
          <Button
            key={tab}
            role="tab"
            aria-selected={query.tab === tab}
            variant="ghost"
            onClick={() => update({ tab, status: '', page: 1 })}
            className={`h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 px-3 text-lg hover:bg-transparent ${query.tab === tab ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
          >
            {t(`admin.finance.tabs.${tab}`)}
          </Button>
        ))}
      </div>
      <FinanceFilters
        query={query}
        merchants={merchants}
        onChange={update}
      />
      {query.tab === 'refunds' && query.orderId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-sm">
            {t('notificationNav.refundScope')}
          </p>
          <Button
            variant="outline"
            onClick={() => update({ orderId: '' })}
          >
            {t('notificationNav.allRefunds')}
          </Button>
        </div>
      )}
      {query.tab === 'commissionReview' ? (
        <CommissionReview
          key={query.merchantId}
          merchantId={query.merchantId}
        />
      ) : resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <>
          {report && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[['totalRevenue', Wallet], ['laundryRevenue', Shirt], ['refundedAmount', Undo2], ['paidOrderCount', Banknote]].map(([key, Icon], index) => (
                  <StatCard
                    key={key}
                    label={t(`admin.finance.kpis.${key}`)}
                    value={key === 'paidOrderCount' ? report[key] : formatCurrency(report[key])}
                    icon={Icon}
                    className={['border-l-primary', 'border-l-emerald-500', 'border-l-red-500', 'border-l-violet-500'][index]}
                    iconClassName={['bg-primary/10 text-primary', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 'bg-red-500/10 text-red-700 dark:text-red-300', 'bg-violet-500/10 text-violet-700 dark:text-violet-300'][index]}
                  />
                ))}
              </div>
              <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="-mx-5 -mt-5 flex items-center gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 px-5 py-4 text-lg font-semibold">
                  <TrendingUp className="size-5 text-primary" />
                  {t('admin.finance.cashflow')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('admin.finance.cashflowHint')}
                </p>
                <div className="rounded-xl border border-primary/10 bg-primary/3 p-3 sm:p-4">
                  <RevenueChart
                    data={report.daily}
                    hourly={report.hourly}
                    range={query}
                  />
                </div>
                <dl className="grid gap-4 sm:grid-cols-3">
                  {['storageFeeRevenue', 'cancellationFeeRevenue', 'totalRevenue'].map(key => (
                    <div
                      key={key}
                      className="rounded-xl bg-muted/30 p-4"
                    >
                      <dt className="text-sm font-medium">
                        {t(`admin.finance.kpis.${key}`)}
                      </dt>
                      <dd className="mt-2 text-xl font-semibold">
                        {formatCurrency(report[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <FinanceTable
                key={`merchants:${params}`}
                rows={report.byMerchant}
                label="admin.finance.merchantResults"
                rowKey={row => row.merchantId || 'unassigned'}
                columns={[{ key: 'merchant', label: 'admin.complaints.merchant', className: 'min-w-72', render: merchantCell }, { key: 'count', label: 'admin.finance.orders', render: row => formatNumber(row.paidOrderCount) }, { key: 'revenue', label: 'admin.finance.kpis.totalRevenue', render: row => formatCurrency(row.revenue) }]}
              />
              <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
                <header className="flex items-start gap-3 border-b border-primary/15 bg-primary/5 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Shirt className="size-6" />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-lg font-semibold">
                      {t('admin.finance.services')}
                    </h2>
                    <p className="text-base leading-6 text-muted-foreground">
                      {t('admin.finance.serviceHint')}
                    </p>
                  </div>
                </header>
                <FinanceTable
                  embedded
                  key={`services:${params}`}
                  rows={report.byService}
                  rowKey={row => row.serviceId}
                  label="admin.finance.serviceResults"
                  columns={[{ key: 'service', label: 'admin.finance.service', className: 'min-w-72', render: row => row.serviceName }, { key: 'quantity', label: 'admin.finance.quantity', render: row => formatNumber(row.quantity) }, { key: 'amount', label: 'admin.finance.listValue', render: row => formatCurrency(row.amount) }]}
                />
              </section>
            </>
          )}
          {query.tab === 'commissions' && (
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {['netRevenue', 'commissionAmount', 'payoutAmount'].map(key => (
                  <StatCard
                    key={key}
                    icon={Wallet}
                    label={t(`admin.finance.fields.${key}`)}
                    value={resource.data.commissionComplete === false && key !== 'netRevenue' ? '—' : formatCurrency(resource.data[key])}
                  />
                ))}
              </div>
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {t('admin.finance.commissionHint')}
              </p>
              <FinanceTable
                key={params.toString()}
                rows={resource.data.list}
                pagination={{ page: query.page, total: resource.data.total, totalPages: resource.data.totalPages, onChange: page => update({ page }) }}
                rowKey={row => row.merchantId}
                label="admin.finance.commissionResults"
                minWidth="min-w-[1600px]"
                columns={[{ key: 'merchant', label: 'admin.complaints.merchant', className: 'min-w-72', render: merchantCell }, ...['grossRevenue', 'refundedAmount', 'netRevenue', 'commissionAmount', 'payoutAmount'].map(moneyColumn), { key: 'orders', label: 'admin.finance.orders', render: row => formatNumber(row.paidOrderCount) }, { key: 'actions', label: 'customer.incidents.actions', render: row => (
                  <Button
                    variant="secondary"
                    className="h-11 px-4"
                    onClick={() => setModal({ kind: 'commissionDetail', value: row })}
                  >
                    <Eye size={18} />
                    {t('admin.finance.detail')}
                  </Button>
                ) }]}
              />
            </section>
          )}
          {query.tab === 'settlements' && (
            <FinanceTable
              rows={resource.data.list}
              label="admin.finance.settlementResults"
              minWidth="min-w-[1650px]"
              pagination={{ page: query.page, total: resource.data.total, totalPages: resource.data.totalPages, onChange: page => update({ page }) }}
              columns={[{ key: 'merchant', label: 'admin.complaints.merchant', className: 'min-w-72', render: merchantCell }, { key: 'period', label: 'admin.finance.period', className: 'min-w-60', render: row => (
                <div>
                  {formatDateTime(row.periodFrom, 'Asia/Ho_Chi_Minh')}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(row.periodTo, 'Asia/Ho_Chi_Minh')}
                  </p>
                </div>
              ) }, ...['netRevenue', 'commissionAmount', 'payoutAmount'].map(moneyColumn), { key: 'status', label: 'admin.finance.status', className: 'min-w-44 whitespace-nowrap', render: row => (
                <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(row.status)}`}>
                  {t(`admin.finance.settlementStatuses.${row.status}`)}
                </span>
              ) }, { key: 'actions', label: 'customer.incidents.actions', render: row => actionMenu(row) }]}
            />
          )}
          {query.tab === 'refunds' && (
            <FinanceTable
              key={`refunds:${params}`}
              rows={resource.data.list}
              pagination={{ page: query.page, total: resource.data.total, totalPages: resource.data.totalPages, onChange: page => update({ page }) }}
              label="admin.finance.refundResults"
              minWidth="min-w-[1250px]"
              columns={[{ key: 'order', label: 'admin.complaints.columns.order', className: 'min-w-48', render: row => (
                <Link
                  to={`${ADMIN_ROUTES.ORDERS}/${row.orderId}`}
                  className="font-semibold text-primary"
                >
                  {row.orderCode || t('customer.incidents.relatedOrder')}
                </Link>
              ) }, { key: 'customer', label: 'admin.complaints.customer', className: 'min-w-52', render: row => (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={row.customerAvatarUrl}
                    fullName={row.customerName}
                    className="size-11"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {row.customerName || '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.customerEmail || '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.customerPhoneNumber || '—'}
                    </p>
                  </div>
                </div>
              ) }, { key: 'amount', label: 'admin.finance.refundAmount', className: 'min-w-44 whitespace-nowrap', render: row => formatCurrency(row.amount) }, { key: 'reason', label: 'admin.finance.reason', className: 'min-w-72 max-w-96', render: row => (
                <p className="whitespace-pre-wrap break-words">
                  {row.reason}
                </p>
              ) }, { key: 'status', label: 'admin.finance.status', className: 'min-w-44 whitespace-nowrap', render: row => (
                <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(row.status)}`}>
                  {t(`admin.finance.refundStatuses.${row.status}`)}
                </span>
              ) }, { key: 'created', label: 'customer.incidents.createdAt', className: 'min-w-48', render: row => formatDateTime(row.createdOn) }, { key: 'actions', label: 'customer.incidents.actions', render: row => actionMenu(row, true) }]}
            />
          )}
          {query.tab === 'settlements' && !resource.data.list.length && query.page > 1 && (
            <Button
              variant="outline"
              onClick={() => update({ page: 1 })}
            >
              {t('admin.promotions.firstPage')}
            </Button>
          )}
        </>
      )}
      {modal && (modal.kind === 'create' ? (
        <SettlementEditor
          merchants={merchants.data || []}
          defaultMerchant={query.merchantId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null); resource.retry()
          }}
        />
      ) : (
        <FinanceRecordDialog
          key={`${modal.kind}:${modal.value.id || modal.value.merchantId}`}
          {...modal}
          period={periodFilter(query)}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null); resource.retry()
          }}
        />
      ))}
    </Reveal>
  )
}
