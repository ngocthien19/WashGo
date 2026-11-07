import Reveal from '~/components/motion/Reveal'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, RefreshCw, Eye, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import Pagination from '~/components/Pagination/Pagination'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import OrderStatus from '~/components/orders/OrderStatus'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderApi } from '~/apis/merchant/merchantOrderApi'
import { initialOrdersQuery } from '~/utils/ordersQuery'
import { readMerchantOrdersQuery, writeMerchantOrdersQuery, buildMerchantOrdersFilter, orderScopeFilter } from './ordersQuery'
import OrderDateFilter from './components/OrderDateFilter'
import OrderSummary from './components/OrderSummary'
import { MERCHANT_ROUTES, ORDER_STATUS_OPTIONS, ORDER_SORT_OPTIONS, PAYMENT_STATUSES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { PAGE_SIZE } from './orderModel'

export default function OrdersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readMerchantOrdersQuery(params), [params])
  const load = useCallback((signal) => merchantOrderApi.list(buildMerchantOrdersFilter(query), signal), [query])
  const loadSummary = useCallback((signal) => merchantOrderApi.summary(orderScopeFilter({ keyword: query.keyword, paymentStatus: query.paymentStatus, from: query.from, to: query.to }), signal), [query.keyword, query.paymentStatus, query.from, query.to])
  const summary = useCatalogResource(loadSummary)
  const resource = useCatalogResource(load)
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
      <section className="grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
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
              className="w-44"
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
              className="min-w-[1150px] text-base"
            >
              <TableHeader>
                <TableRow>
                  {['code', 'services', 'locker', 'state', 'weight', 'total', 'shipper', 'actions'].map((key) => (
                    <TableHead key={key}>
                      {t(`merchant.orders.${key}`)}
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
                    <TableCell className="max-w-60">
                      <p className="line-clamp-3">
                        {order.serviceNames?.join(', ') || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>
                        {order.lockerName || '—'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('customer.order.box', { number: order.boxNumber || '—' })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <OrderStatus status={order.status} />
                        <span className={`text-sm ${order.paymentStatus === 2 ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                          {t(`customer.orders.paymentStatus.${order.paymentStatus}`, { defaultValue: '—' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {order.actualWeightKg == null ? t('customer.orders.notWeighed') : `${order.actualWeightKg} kg`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-bold">
                      {formatCurrency(order.finalAmount)}
                    </TableCell>
                    <TableCell>
                      {order.shipperName || t('merchant.orders.unassigned')}
                    </TableCell>
                    <TableCell>
                      <Button
                        render={<Link to={`${MERCHANT_ROUTES.ORDERS}/${order.id}`} />}
                        nativeButton={false}
                        variant="secondary"
                        size="icon"
                        aria-label={t('merchant.viewOrder', { code: order.orderCode })}
                      >
                        <Eye size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-4 border-t border-border p-5">
              <p className="text-sm text-muted-foreground">
                {t('customer.showing', { firstResult: (data.currentPage - 1) * PAGE_SIZE + 1, lastResult: (data.currentPage - 1) * PAGE_SIZE + data.list.length, total: data.total })}
              </p>
              <Pagination
                currentPage={data.currentPage}
                totalPages={data.totalPages}
                onPageChange={(page) => update({ page })}
              />
            </div>
          </>
        )}
      </section>
    </Reveal>
  )
}
