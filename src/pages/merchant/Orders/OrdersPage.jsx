import Reveal from '~/components/motion/Reveal'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, RefreshCw, Eye, RotateCcw, MoreHorizontal, Truck } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import TablePagination from '~/components/Pagination/TablePagination'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import OrderStatus from '~/components/orders/OrderStatus'
import PaymentStatus from '~/components/orders/PaymentStatus'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderApi } from '~/apis/merchant/merchantOrderApi'
import { initialOrdersQuery } from '~/utils/ordersQuery'
import { readMerchantOrdersQuery, writeMerchantOrdersQuery, buildMerchantOrdersFilter, orderScopeFilter } from './ordersQuery'
import OrderDateFilter from './components/OrderDateFilter'
import OrderSummary from './components/OrderSummary'
import { MERCHANT_ROUTES, ORDER_STATUS_OPTIONS, ORDER_SORT_OPTIONS, PAYMENT_STATUSES } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { PAGE_SIZE, assignmentTask } from './orderModel'
import OrderActionDialog from './components/OrderActionDialog'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'

const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'

export default function OrdersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readMerchantOrdersQuery(params), [params])
  const load = useCallback((signal) => merchantOrderApi.list(buildMerchantOrdersFilter(query), signal), [query])
  const loadSummary = useCallback((signal) => merchantOrderApi.summary(orderScopeFilter({ keyword: query.keyword, paymentStatus: query.paymentStatus, from: query.from, to: query.to }), signal), [query.keyword, query.paymentStatus, query.from, query.to])
  const summary = useCatalogResource(loadSummary)
  const resource = useCatalogResource(load)
  const [assignment, setAssignment] = useState(null)
  const [openingAssignment, setOpeningAssignment] = useState(false)
  const openAssignment = async (id) => {
    if (openingAssignment) {
      return
    }
    setOpeningAssignment(true)
    try {
      const latest = await merchantOrderApi.detail(id)
      if (assignmentTask(latest) !== 1) {
        notify.error('merchant.orders.changed')
        resource.retry()
        return
      }
      setAssignment(latest)
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setOpeningAssignment(false)
    }
  }
  const { data, loading, error } = resource
  const update = (patch) => setParams(writeMerchantOrdersQuery({ ...query, ...patch, page: patch.page || 1 }))
  useEffect(() => {
    document.title = `${t('merchant.nav.orders')} | WashGo`
  }, [t])
  const fields = [
    { key: 'status', label: 'customer.orders.orderStatus', options: ORDER_STATUS_OPTIONS.map((item) => ({ value: item.value, label: t(item.label) })) },
    { key: 'paymentStatus', label: 'customer.orders.paymentLabel', options: Object.values(PAYMENT_STATUSES).map((value) => ({ value: String(value), label: t(`customer.orders.paymentStatus.${value}`) })) }
  ]
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <ClipboardList className="text-primary" />
            {t('merchant.nav.orders')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('merchant.orders.description')}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-4 text-base"
          disabled={loading || summary.loading}
          onClick={() => {
            resource.retry(); summary.retry()
          }}
        >
          <RefreshCw size={17} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      <OrderSummary resource={summary} />
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
        <div className="grid gap-2">
          <p
            className="text-sm text-muted-foreground"
            aria-hidden="true"
          >
            {t('merchant.orders.search')}
          </p>
          <CatalogToolbar
            embedded
            keyword={query.keyword}
            label={t('merchant.orders.search')}
            placeholder={t('merchant.orders.searchHint')}
            onSearch={(keyword) => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        {fields.map(({ key, label, options }) => (
          <div
            key={key}
            className="grid gap-2"
          >
            <label
              className="text-sm text-muted-foreground"
              htmlFor={`merchant-${key}`}
            >
              {t(label)}
            </label>
            <SelectField
              id={`merchant-${key}`}
              label={t(label)}
              value={query[key]}
              options={[{ value: '', label: t('common.all') }, ...options]}
              onValueChange={(value) => update({ [key]: value })}
            />
          </div>
        ))}
        <OrderDateFilter
          key={`${query.from}-${query.to}`}
          from={query.from}
          to={query.to}
          onApply={update}
        />
      </section>
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-busy={loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <p className="text-base text-muted-foreground">
            {!loading && !error && data && (
              <strong className="mr-2 text-2xl text-foreground">
                <AnimatedNumber value={data.total} />
              </strong>
            )}
            {t('merchant.orders.results')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {(query.keyword || query.status || query.paymentStatus || query.from || query.to) && (
              <Button
                variant="ghost"
                className="h-11 text-base"
                onClick={() => setParams(writeMerchantOrdersQuery({ ...initialOrdersQuery, sort: query.sort }))}
              >
                <RotateCcw size={16} />
                {t('merchant.orders.clear')}
              </Button>
            )}
            <SelectField
              label={t('customer.orders.sort')}
              value={query.sort}
              options={ORDER_SORT_OPTIONS.map((item) => ({ value: item.value, label: t(item.label) }))}
              onValueChange={(sort) => update({ sort })}
              className="workspace-filters w-44 font-medium"
            />
          </div>
        </div>
        {loading || error || !data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="customer.orders.loading"
            empty="merchant.orders.empty"
          />
        ) : (
          <>
            <Table
              aria-label={t('merchant.nav.orders')}
              className="min-w-[1500px] text-base"
            >
              <TableHeader>
                <TableRow>
                  {['code', 'services', 'locker', 'state', 'weight', 'total', 'commissionRate', 'shipper', 'actions'].map((key) => (
                    <TableHead
                      key={key}
                      className={`${headerBg} ${key === 'locker' ? 'min-w-[340px]' : key === 'actions' ? 'sticky right-0 z-20 w-24 border-l border-border text-center' : ''}`}
                    >
                      {t(key === 'commissionRate' ? 'merchant.orderView.commissionRate' : `merchant.orders.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map((order) => (
                  <TableRow
                    key={order.id}
                    className={order.isNew ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <Link
                        to={`${MERCHANT_ROUTES.ORDERS}/${order.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {order.orderCode}
                      </Link>
                      {order.isNew && (
                        <span className="ml-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {t('merchant.orders.new')}
                        </span>
                      )}
                      {order.merchantOrderCode && (
                        <p className="mt-1 text-sm font-medium">
                          {order.merchantOrderCode}
                        </p>
                      )}
                      <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(order.createdOn)}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-[280px] max-w-96">
                      <div className="space-y-3">
                        {(order.services?.length ? order.services : (order.serviceNames || []).map(serviceName => ({ serviceName }))).map((service, index) => (
                          <div
                            key={service.serviceId || index}
                            className="flex items-center gap-3"
                          >
                            <ResourceThumbnail
                              urls={service.serviceThumbnailUrl ? [service.serviceThumbnailUrl] : service.serviceImageUrls || []}
                              name={service.serviceName}
                            />
                            <span className="font-semibold">
                              {service.serviceName}
                            </span>
                          </div>
                        ))}
                        {!order.services?.length && !order.serviceNames?.length && '—'}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[340px]">
                      <div className="flex items-center gap-3">
                        <ResourceThumbnail
                          urls={order.lockerImageUrls || []}
                          name={order.lockerName}
                        />
                        <div>
                          <p className="font-semibold">
                            {order.lockerName || '—'}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('customer.order.box', { number: order.boxNumber || '—' })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <OrderStatus status={order.status} />
                        <PaymentStatus status={order.paymentStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {order.actualWeightKg == null ? t('customer.orders.notWeighed') : `${order.actualWeightKg} kg`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-bold">
                      {formatCurrency(order.finalAmount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {order.commissionStatus !== 'Missing' && Number.isFinite(order.commissionRateApplied) && order.commissionRateApplied >= 0 && order.commissionRateApplied <= 100 ? `${formatNumber(order.commissionRateApplied)}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-48 items-center gap-3">
                        <UserAvatar
                          avatar={order.shipperAvatarUrl}
                          fullName={order.shipperName}
                          className="size-11"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {order.shipperName || t('merchant.orders.unassigned')}
                          </p>
                          {order.shipperEmail && (
                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {order.shipperEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            variant="secondary"
                            size="icon"
                            className="size-10 rounded-xl"
                            aria-label={t('merchant.viewOrder', { code: order.orderCode })}
                          />
                        )}
                        >
                          <MoreHorizontal size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem render={<Link to={`${MERCHANT_ROUTES.ORDERS}/${order.id}`} />}>
                            <Eye size={16} />
                            {t('admin.merchants.details')}
                          </DropdownMenuItem>
                          {(order.allowedActions ? assignmentTask(order) === 1 : order.status === 2) && (
                            <DropdownMenuItem
                              disabled={openingAssignment}
                              onClick={() => openAssignment(order.id)}
                              className="text-teal-700 dark:text-teal-300"
                            >
                              <Truck size={16} />
                              {t('merchant.orders.assignCollect')}
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
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={(page) => update({ page })}
              total={data.total}
              pageSize={PAGE_SIZE}
              rowCount={data.list.length}
            />
          </>
        )}
      </section>
      {assignment && (
        <OrderActionDialog
          key={assignment.id}
          action="assign"
          order={assignment}
          onClose={() => setAssignment(null)}
          onSaved={() => {
            setAssignment(null); resource.retry(); summary.retry()
          }}
        />
      )}
    </Reveal>
  )
}
