import HistoryDetail from './HistoryDetail'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import DeliveryLocker from '../components/DeliveryLocker'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { History, RefreshCw, Download, Eye, ClockArrowDown, PackageOpen, Truck } from 'lucide-react'
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
  const [revision, setRevision] = useState(0), [selected, setSelected] = useState(null), [exporting, setExporting] = useState(false), [reset, setReset] = useState(0)
  const lockers = useCatalogResource(useCallback(signal => shipperDeliveryApi.lockers({ ...historyFilter(query), lockerId: undefined }, signal), [query]), revision)
  const download = async () => {
    if (exporting) {
      return
    }
    setExporting(true)
    try {
      const blob = await shipperDeliveryApi.export(historyFilter(query)); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'shipper-delivery.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setExporting(false)
    }
  }
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
        query={query}
        revision={revision}
      />
      <section className="workspace-filters space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <CatalogToolbar
          suggestionSource={shipperDeliveryApi.list}
          suggestionKind="delivery"
          suggestionFilter={historyFilter(query)}
          embedded
          resetKey={reset}
          keyword={query.keyword}
          onSearch={keyword => update({ keyword })}
          label={t('shipper.tasks.search')}
          placeholder={t('shipper.tasks.searchHint')}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <SelectField
            label={t('shipper.deliveryHistory.locker')}
            value={query.lockerId}
            onValueChange={lockerId => update({ lockerId })}
            disabled={lockers.loading || !!lockers.error}
            options={[{ value: '', label: t('common.all') }, ...(lockers.data || []).map(row => ({ value: row.id, label: row.name }))]}
          />
          <SelectField
            label={t('shipper.sync.cancelledReturn')}
            value={query.cancelledReturn}
            onValueChange={cancelledReturn => update({ cancelledReturn })}
            options={[{ value: '', label: t('common.all') }, { value: 'true', label: t('shipper.sync.cancelledOnly') }, { value: 'false', label: t('shipper.sync.normalOnly') }]}
          />
          <SelectField
            label={t('shipper.sync.sort')}
            value={query.sort}
            onValueChange={sort => update({ sort })}
            options={[{ value: 'newest', label: t('shipper.deliveryHistory.newest') }, { value: 'oldest', label: t('shipper.sync.oldest') }]}
          />
          <ClearFiltersButton
            active={query.from || query.to || query.taskType || query.keyword || query.lockerId || query.cancelledReturn || query.sort === 'oldest' || query.invalidDates}
            onClear={() => {
              setReset(value => value + 1); setParams({})
            }}
          />
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
      <div className="flex justify-end">
        <Button
          className="h-11 px-5"
          variant="outline"
          onClick={download}
          disabled={exporting || loading}
        >
          <Download className="size-4" />
          {t('shipper.sync.export')}
        </Button>
      </div>
      <section
        data-pagination-scope
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
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
                  {['order', 'taskType', 'locker', 'completedAt', 'orderStatus', 'actions'].map((key) => (
                    <TableHead
                      key={key}
                      className="px-5 py-4 whitespace-nowrap font-semibold"
                    >
                      {t(key === 'actions' ? 'shipper.tasks.actions' : `shipper.deliveryHistory.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map((row) => {
                  const Icon = row.taskType === 1 ? PackageOpen : Truck
                  return (
                    <TableRow key={row.eventId}>
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
                      <TableCell className="px-5 py-5">
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label={t('shipper.sync.eventDetail')}
                          onClick={() => setSelected(row.eventId)}
                        >
                          <Eye className="size-4" />
                        </Button>
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
      {selected && (
        <HistoryDetail
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </Reveal>
  )
}
