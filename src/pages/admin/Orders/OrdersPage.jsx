import CancelExpiredDialog from './components/CancelExpiredDialog'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, RefreshCw, Eye, MoreHorizontal, Store, WandSparkles, X, ListFilter } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import OrderStatus from '~/components/orders/OrderStatus'
import PaymentStatus from '~/components/orders/PaymentStatus'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import OrderSummary from '~/components/orders/OrderSummary'
import Reveal from '~/components/motion/Reveal'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminOrderApi } from '~/apis/admin/adminOrderApi'
import { ADMIN_ROUTES, ORDER_STATUS_OPTIONS, ORDER_SORT_OPTIONS, PAYMENT_STATUSES } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatDurationMinutes, formatNumber } from '~/utils/formats'
import { TAKE, readAdminOrdersQuery, writeAdminOrdersQuery, listFilter, scopeFilter, waitingFilter } from './ordersModel'
import MerchantAssignmentDialog from './components/MerchantAssignmentDialog'

const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
function PartnerFilter({ kind, value, onChange, resource }) {
  const { t } = useTranslation()
  const label = t(`admin.orderManagement.${kind}`)
  const options = resource.data || []
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor={`admin-order-${kind}`}
        className="text-sm font-medium"
      >
        {label}
      </label>
      <SelectField
        id={`admin-order-${kind}`}
        label={label}
        value={value}
        disabled={resource.loading || !!resource.error}
        options={[{ value: '', label: t(resource.loading ? 'admin.loading' : 'common.all') }, ...options, ...(value && !options.some(item => item.value === value) ? [{ value, label: value }] : [])]}
        onValueChange={onChange}
      />
      {resource.error && (
        <Button
          variant="link"
          className="h-auto justify-start p-0 text-xs text-destructive"
          onClick={resource.retry}
        >
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}
export default function OrdersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readAdminOrdersQuery(params), [params])
  const waiting = query.tab === 'waiting'
  const [cancelId, setCancelId] = useState(null), [revision, setRevision] = useState(0), [selection, setSelection] = useState({ data: null, ids: [] }), [assignment, setAssignment] = useState(null)
  const load = useCallback(signal => waiting ? adminOrderApi.waiting(waitingFilter(query), signal) : adminOrderApi.list(listFilter(query), signal), [query, waiting])
  const resource = useCatalogResource(load, revision)
  const loadMerchants = useCallback(signal => adminOrderApi.lookup('/merchant/filter', 'businessName', signal), [])
  const loadLockers = useCallback(signal => adminOrderApi.lookup('/locker/filter', 'name', signal), [])
  const merchants = useCatalogResource(loadMerchants, revision)
  const lockers = useCatalogResource(loadLockers, revision)
  const merchantMedia = new Map((merchants.data || []).map(item => [item.value, item.imageUrls]))
  const merchantPhones = new Map((merchants.data || []).map(item => [item.value, item.phone]))
  const lockerMedia = new Map((lockers.data || []).map(item => [item.value, item.imageUrls]))
  const { keyword, paymentStatus, from, to, merchantId, lockerId, depositExpired } = query
  const summaryFilter = useMemo(() => scopeFilter({ keyword, paymentStatus, from, to, merchantId, lockerId, depositExpired }), [keyword, paymentStatus, from, to, merchantId, lockerId, depositExpired])
  const loadSummary = useCallback(signal => adminOrderApi.summary(summaryFilter, signal), [summaryFilter])
  const summary = useCatalogResource(loadSummary, revision)
  const rows = resource.data?.list || []
  const selected = waiting && selection.data === resource.data && !resource.loading ? selection.ids : []
  const update = (patch) => setParams(writeAdminOrdersQuery({ ...query, ...patch, page: patch.page || 1 }))
  const refresh = () => {
    setSelection({ data: null, ids: [] }); setRevision(value => value + 1)
  }
  const toggle = (id, checked) => setSelection({ data: resource.data, ids: checked ? [...selected, id] : selected.filter(value => value !== id) })
  useEffect(() => {
    document.title = `${t('admin.nav.orders')} | WashGo`
  }, [t])
  useEffect(() => {
    if (resource.data && !resource.loading && query.page > Math.max(1, resource.data.totalPages)) {
      setParams(writeAdminOrdersQuery({ ...query, page: Math.max(1, resource.data.totalPages) }), { replace: true })
    }
  }, [resource.data, resource.loading, query, setParams])
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <ClipboardList className="text-primary" />
            {t('admin.nav.orders')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('admin.orderManagement.description')}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-5 text-base"
          onClick={refresh}
          disabled={resource.loading}
        >
          <RefreshCw size={18} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      {!waiting && (
        <OrderSummary
          resource={summary}
          totalLabel="admin.orderManagement.totalOrders"
        />
      )}
      <div
        role="tablist"
        aria-label={t('admin.nav.orders')}
        className="flex flex-wrap gap-3 border-b border-border"
      >
        {['all', 'waiting'].map(tab => (
          <Button
            key={tab}
            role="tab"
            aria-selected={query.tab === tab}
            variant="ghost"
            className={`h-12 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-4 text-lg hover:bg-transparent dark:hover:bg-transparent ${query.tab === tab ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
            onClick={() => setParams(tab === 'waiting' ? { tab: 'waiting' } : {})}
          >
            {t(`admin.orderManagement.tabs.${tab}`)}
          </Button>
        ))}
      </div>
      <section className="workspace-filters space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-primary/15 pb-3 text-base font-semibold">
          <ListFilter className="size-5 text-primary" />
          {t('customer.filters')}
        </h2>
        {!waiting && (
          <label className={`flex w-fit cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base ${query.depositExpired ? 'border-primary/40 bg-primary/10 text-primary' : 'border-primary/15 bg-primary/5'}`}>
            <input
              type="checkbox"
              className="size-5 cursor-pointer accent-primary"
              checked={query.depositExpired}
              onChange={event => update({ depositExpired: event.target.checked })}
            />
            {t('admin.sync.depositExpired')}
          </label>
        )}
        {waiting ? (
          <label className="flex w-fit items-center gap-3 text-sm">
            <Checkbox
              checked={query.overdue}
              onCheckedChange={overdue => update({ overdue })}
            />
            {t('admin.orderManagement.overdueOnly')}
          </label>
        ) : (
          <div className="grid items-end gap-4 lg:grid-cols-[2fr_1fr_1fr]">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">
                {t('admin.orderManagement.search')}
              </p>
              <CatalogToolbar
                embedded
                keyword={query.keyword}
                label={t('admin.orderManagement.search')}
                placeholder={t('admin.orderManagement.searchHint')}
                onSearch={keyword => update({ keyword })}
                formClassName="h-11"
              />
            </div>
            {[['status', 'customer.orders.orderStatus', ORDER_STATUS_OPTIONS.map(item => ({ value: item.value, label: t(item.label) }))], ['paymentStatus', 'customer.orders.paymentLabel', Object.values(PAYMENT_STATUSES).map(value => ({ value: String(value), label: t(`customer.orders.paymentStatus.${value}`) }))]].map(([key, label, options]) => (
              <div
                key={key}
                className="flex min-w-0 flex-col gap-2"
              >
                <label
                  htmlFor={`admin-order-${key}`}
                  className="text-sm font-medium"
                >
                  {t(label)}
                </label>
                <SelectField
                  id={`admin-order-${key}`}
                  label={t(label)}
                  value={query[key]}
                  options={[{ value: '', label: t('common.all') }, ...options]}
                  onValueChange={value => update({ [key]: value })}
                />
              </div>
            ))}
          </div>
        )}
        {!waiting && (
          <div className="grid gap-4 sm:grid-cols-2">
            <PartnerFilter
              kind="merchant"
              resource={merchants}
              value={query.merchantId}
              onChange={merchantId => update({ merchantId })}
            />
            <PartnerFilter
              kind="locker"
              resource={lockers}
              value={query.lockerId}
              onChange={lockerId => update({ lockerId })}
            />
          </div>
        )}
        <DateRangeFilter
          key={`${query.tab}/${query.from}/${query.to}`}
          from={query.from}
          to={query.to}
          label={waiting ? 'admin.orderManagement.depositedRange' : 'merchant.orders.createdRange'}
          onApply={update}
          className="space-y-3 border-t border-border pt-4"
        />
        {(query.keyword || query.status || query.paymentStatus || query.from || query.to || query.overdue || query.depositExpired || query.merchantId || query.lockerId) && (
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => setParams(waiting ? { tab: 'waiting' } : {})}
          >
            <X size={16} />
            {t('merchant.orders.clear')}
          </Button>
        )}
      </section>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <span className="text-sm font-medium text-primary">
            {t('admin.orderManagement.selected', { count: selected.length })}
          </span>
          <div className="flex gap-3">
            <Button
              className="h-11 px-5 text-base"
              onClick={() => setAssignment({ ids: selected })}
            >
              <WandSparkles size={18} />
              {t('admin.orderManagement.suggest')}
            </Button>
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => setSelection({ data: null, ids: [] })}
            >
              {t('admin.orderManagement.clearSelection')}
            </Button>
          </div>
        </div>
      )}
      <section
        data-pagination-scope
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <p>
            <strong className="mr-2 text-2xl tabular-nums">
              {resource.data?.total ?? '—'}
            </strong>
            {t('merchant.orders.results')}
          </p>
          {!waiting && (
            <SelectField
              label={t('customer.orders.sort')}
              value={query.sort}
              options={ORDER_SORT_OPTIONS.map(item => ({ value: item.value, label: t(item.label) }))}
              onValueChange={sort => update({ sort })}
              className="workspace-filters w-44"
            />
          )}
        </div>
        {resource.loading || resource.error || !rows.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="admin.loading"
            empty="admin.orderManagement.empty"
          />
        ) : (
          <>
            <Table
              aria-label={t('admin.nav.orders')}
              className="min-w-[1500px]"
            >
              <TableHeader>
                <TableRow>
                  {waiting && (
                    <TableHead className={headerBg}>
                      <Checkbox
                        aria-label={t('admin.orderManagement.selectPage')}
                        checked={rows.length > 0 && selected.length === rows.length}
                        onCheckedChange={checked => setSelection({ data: resource.data, ids: checked ? rows.map(row => row.id) : [] })}
                      />
                    </TableHead>
                  )}
                  {(waiting ? ['code', 'locker', 'services', 'deposited', 'wait'] : ['code', 'customer', 'merchant', 'locker', 'status', 'payment', 'amount', 'commissionRate']).map(key => (
                    <TableHead
                      key={key}
                      className={`${headerBg} py-4 ${key === 'locker' ? 'min-w-[340px]' : key === 'merchant' ? 'min-w-[250px]' : key === 'customer' ? 'min-w-[220px]' : ''}`}
                    >
                      {t(key === 'commissionRate' ? 'merchant.sync.commissionRate' : `admin.orderManagement.columns.${key}`)}
                    </TableHead>
                  ))}
                  <TableHead className={`${headerBg} sticky right-0 z-20 w-24 border-l border-border text-center`}>
                    {t('admin.merchants.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow
                    key={row.id}
                    className={waiting && row.isOverdue ? 'bg-rose-500/5' : ''}
                  >
                    {waiting && (
                      <TableCell>
                        <Checkbox
                          aria-label={t('admin.orderManagement.selectOrder', { code: row.orderCode })}
                          checked={selected.includes(row.id)}
                          onCheckedChange={checked => toggle(row.id, checked)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link
                        to={`${ADMIN_ROUTES.ORDERS}/${row.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.orderCode}
                      </Link>
                      {!waiting && (
                        <p className="mt-2 whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(row.createdOn)}
                        </p>
                      )}
                    </TableCell>
                    {!waiting && (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatar={row.customerAvatarUrl}
                              fullName={row.customerName}
                              alt={row.customerName || ''}
                              className="size-11"
                            />
                            <div>
                              <p className="text-base font-semibold">
                                {row.customerName || '—'}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {row.customerPhoneNumber || '—'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[250px] whitespace-normal">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatar={row.merchantImageUrls?.[0] || merchantMedia.get(row.merchantId)?.[0]}
                              fullName={row.merchantName}
                              alt={row.merchantName || ''}
                              className="size-11"
                            />
                            <div className="min-w-0">
                              <p className="text-base font-semibold">
                                {row.merchantName || t('admin.orderManagement.unassigned')}
                              </p>
                              {row.merchantId && (
                                <p className="mt-1 whitespace-nowrap text-sm text-muted-foreground">
                                  {row.merchantPhoneNumber || merchantPhones.get(row.merchantId) || '—'}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="min-w-[340px] whitespace-normal">
                      <div className="flex items-center gap-3">
                        <ResourceThumbnail
                          urls={row.lockerImageUrls || lockerMedia.get(row.lockerId) || []}
                          name={row.lockerName}
                        />
                        <div>
                          <p className="text-base font-semibold">
                            {row.lockerName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('merchant.orders.box')}
                            :
                            {' '}
                            {row.boxNumber || '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {waiting ? (
                      <>
                        <TableCell className="max-w-56 whitespace-normal">
                          {row.services.join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(row.depositedAt)}
                        </TableCell>
                        <TableCell>
                          <p className={row.isOverdue ? 'font-semibold text-rose-600 dark:text-rose-300' : ''}>
                            {formatDurationMinutes(row.waitingMinutes)}
                          </p>
                          {row.isOverdue && (
                            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                              {t('admin.overdue')}
                            </p>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <OrderStatus status={row.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatus status={row.paymentStatus} />
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {formatCurrency(row.finalAmount)}
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {row.commissionStatus !== 'Missing' && Number.isFinite(row.commissionRateApplied) && row.commissionRateApplied >= 0 && row.commissionRateApplied <= 100 ? `${formatNumber(row.commissionRateApplied)}%` : '—'}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={t('admin.orderManagement.actionsFor', { code: row.orderCode })}
                            className="size-10 rounded-xl"
                          />
                        )}
                        >
                          <MoreHorizontal size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem render={<Link to={`${ADMIN_ROUTES.ORDERS}/${row.id}`} />}>
                            <Eye size={16} />
                            {t('admin.merchants.details')}
                          </DropdownMenuItem>
                          {row.allowedActions?.canCancelExpiredDeposit && (
                            <DropdownMenuItem
                              onClick={() => setCancelId(row.id)}
                              className="text-destructive"
                            >
                              <X size={16} />
                              {t('admin.sync.cancelExpired')}
                            </DropdownMenuItem>
                          )}
                          {waiting && (
                            <DropdownMenuItem onClick={() => setAssignment({ id: row.id })}>
                              <Store size={16} />
                              {t('admin.orderManagement.assignMerchant')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={query.page}
              totalPages={resource.data.totalPages}
              onPageChange={page => update({ page })}
              total={resource.data.total}
              pageSize={TAKE}
              rowCount={resource.data.list.length}
            />
          </>
        )}
      </section>
      {cancelId && (
        <CancelExpiredDialog
          id={cancelId}
          onClose={() => setCancelId(null)}
          onSaved={() => {
            setCancelId(null); refresh()
          }}
        />
      )}
      {assignment && (
        <MerchantAssignmentDialog
          {...assignment}
          onClose={() => {
            setAssignment(null); refresh()
          }}
          onSaved={() => {
            setAssignment(null); refresh()
          }}
        />
      )}
    </Reveal>
  )
}
