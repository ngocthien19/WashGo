import DeliveryLocker from '../components/DeliveryLocker'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { History, RefreshCw, RotateCcw, ClockArrowDown, PackageOpen, Truck } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import TablePagination from '~/components/Pagination/TablePagination'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import OrderStatus from '~/components/orders/OrderStatus'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperDeliveryApi } from '~/apis/shipper/shipperDeliveryApi'
import { formatDateTime, formatNumber } from '~/utils/formats'
import { HISTORY_TAKE, readHistoryQuery, historyFilter, historyParams } from './historyModel'
import HistorySummary from './HistorySummary'

export default function DeliveryHistoryPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readHistoryQuery(params), [params])
  const [revision, setRevision] = useState(0)
  const resource = useCatalogResource(useCallback((signal) => shipperDeliveryApi.list(historyFilter(query), signal), [query]), revision)
  const { data, loading, error } = resource
  const update = (patch) => setParams(historyParams({ ...query, ...patch, page: patch.page || 1 }))
  useEffect(() => {
    document.title = `${t('shipper.nav.history')} | WashGo`
  }, [t])
  useEffect(() => {
    if (data && query.page > Math.max(1, data.totalPages)) {
      setParams(historyParams({ ...query, page: Math.max(1, data.totalPages) }), { replace: true })
    }
  }, [data, query, setParams])
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <History className="text-primary" />
            {t('shipper.nav.history')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('shipper.deliveryHistory.description')}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-5 text-base"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={17} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      <HistorySummary
        from={query.from}
        to={query.to}
        revision={revision}
      />
      <section className="workspace-filters space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid w-full gap-2 sm:w-72">
            <label
              htmlFor="delivery-task-type"
              className="text-sm font-medium"
            >
              {t('shipper.deliveryHistory.taskType')}
            </label>
            <SelectField
              id="delivery-task-type"
              label={t('shipper.deliveryHistory.taskType')}
              value={query.taskType}
              onValueChange={(taskType) => update({ taskType })}
              options={['', '1', '2'].map((value) => ({ value, label: t(value === '' ? 'shipper.deliveryHistory.allTypes' : value === '1' ? 'shipper.deliveryHistory.collect' : 'shipper.deliveryHistory.return') }))}
            />
          </div>
          {(query.from || query.to || query.taskType || query.invalidDates) && (
            <Button
              variant="secondary"
              className="h-11 px-5"
              onClick={() => setParams({})}
            >
              <RotateCcw size={17} />
              {t('shipper.deliveryHistory.reset')}
            </Button>
          )}
        </div>
        <DateRangeFilter
          key={`${query.from}-${query.to}`}
          from={query.from}
          to={query.to}
          label="shipper.deliveryHistory.dateRange"
          className="space-y-3 border-t border-border pt-4"
          onApply={({ from, to }) => update({ from, to })}
        />
        {query.invalidDates && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {t('shipper.deliveryHistory.invalidUrlDates')}
          </p>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">
            <strong className="mr-2 text-2xl font-bold tabular-nums">
              {loading ? '…' : error ? '—' : formatNumber(data?.total)}
            </strong>
            {t('shipper.deliveryHistory.results')}
          </p>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClockArrowDown size={17} />
            {t('shipper.deliveryHistory.newest')}
          </span>
        </div>
        {loading || error || !data?.list.length ? (
          <ResourceFeedback
            {...resource}
            empty="shipper.deliveryHistory.empty"
          />
        ) : (
          <>
            <Table
              className="min-w-[900px]"
              aria-label={t('shipper.nav.history')}
            >
              <TableHeader className="bg-primary/5">
                <TableRow>
                  {['order', 'taskType', 'locker', 'completedAt', 'orderStatus'].map((key) => (
                    <TableHead
                      key={key}
                      className="px-5 py-4 whitespace-nowrap font-semibold"
                    >
                      {t(`shipper.deliveryHistory.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map((row, index) => {
                  const Icon = row.taskType === 1 ? PackageOpen : Truck
                  return (
                    <TableRow key={`${row.orderId}-${row.taskType}-${row.completedAt}-${index}`}>
                      <TableCell className="px-5 py-5">
                        <strong className="inline-flex whitespace-nowrap rounded-lg bg-primary/10 px-3 py-2 text-primary">
                          {row.orderCode}
                        </strong>
                      </TableCell>
                      <TableCell className="px-5 py-5">
                        <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ${row.taskType === 1 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-violet-500/10 text-violet-700 dark:text-violet-300'}`}>
                          <Icon size={17} />
                          {t(row.taskType === 1 ? 'shipper.deliveryHistory.collect' : 'shipper.deliveryHistory.return')}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-64 px-5 py-5">
                        <DeliveryLocker
                          name={row.lockerName}
                          address={row.lockerAddress}
                          images={row.lockerImageUrls}
                          box={row.boxNumber}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-5 tabular-nums">
                        {formatDateTime(row.completedAt, 'Asia/Ho_Chi_Minh')}
                      </TableCell>
                      <TableCell className="px-5 py-5">
                        <OrderStatus status={row.orderStatus} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
        {data && !loading && !error && (
          <TablePagination
            currentPage={query.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={HISTORY_TAKE}
            rowCount={data.list.length}
            onPageChange={(page) => update({ page })}
          />
        )}
      </section>
    </Reveal>
  )
}
