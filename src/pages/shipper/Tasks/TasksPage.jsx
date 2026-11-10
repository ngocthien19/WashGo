import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Truck, PackageOpen, RefreshCw, MoreHorizontal, Eye, RotateCcw } from 'lucide-react'
import TaskMapDialog from './TaskMapDialog'
import TaskQuickAction from './TaskQuickAction'
import Reveal from '~/components/motion/Reveal'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import TablePagination from '~/components/Pagination/TablePagination'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import OrderStatus from '~/components/orders/OrderStatus'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { SHIPPER_ROUTES } from '~/utils/constants'
import { formatDateTime, formatNumber } from '~/utils/formats'
import DeliveryTypeBadge from '../components/DeliveryTypeBadge'
import { readTaskQuery, taskFilter, taskParams, TASK_TAKE } from './taskModel'
import TaskSummary from './TaskSummary'
import DeliveryLocker from '../components/DeliveryLocker'
import { taskLocker } from '../components/deliveryLockerModel'

export default function TasksPage() {
  const { t } = useTranslation()
  const { profile } = useOutletContext()
  const [mapId, setMapId] = useState(null)
  const [acting, setActing] = useState(null)
  const [blockedIds, setBlockedIds] = useState([])
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readTaskQuery(params), [params])
  const [revision, setRevision] = useState(0)
  const resource = useCatalogResource(useCallback((signal) => shipperTaskApi.list(taskFilter(query), signal), [query]), revision)
  const { data, loading, error } = resource
  const update = (patch) => setParams(taskParams({ ...query, ...patch, page: patch.page || 1 }))
  useEffect(() => {
    document.title = `${t('shipper.nav.tasks')} | WashGo`
  }, [t])
  useEffect(() => {
    if (data && query.page > Math.max(1, data.totalPages)) {
      setParams(taskParams({ ...query, page: Math.max(1, data.totalPages) }), { replace: true })
    }
  }, [data, query, setParams])
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Truck className="text-primary" />
            {t('shipper.nav.tasks')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('shipper.tasks.description')}
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
      <TaskSummary
        keyword={query.keyword}
        revision={revision}
      />
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-[minmax(0,2fr)_minmax(200px,1fr)_auto]">
        <div className="grid gap-2">
          <p className="text-sm font-medium">
            {t('shipper.tasks.search')}
          </p>
          <CatalogToolbar
            embedded
            keyword={query.keyword}
            onSearch={(keyword) => update({ keyword })}
            label={t('shipper.tasks.search')}
            placeholder={t('shipper.tasks.searchHint')}
            formClassName="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="task-type"
            className="text-sm font-medium"
          >
            {t('shipper.deliveryHistory.taskType')}
          </label>
          <SelectField
            id="task-type"
            label={t('shipper.deliveryHistory.taskType')}
            value={query.taskType}
            onValueChange={(taskType) => update({ taskType })}
            options={['', '1', '2'].map((value) => ({ value, label: t(value === '' ? 'shipper.deliveryHistory.allTypes' : value === '1' ? 'shipper.deliveryHistory.collect' : 'shipper.deliveryHistory.return') }))}
          />
        </div>
        {(query.keyword || query.taskType) && (
          <Button
            variant="secondary"
            className="h-11 px-5"
            onClick={() => setParams({})}
          >
            <RotateCcw size={17} />
            {t('shipper.deliveryHistory.reset')}
          </Button>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <p className="p-5 text-sm">
          <strong className="mr-2 text-2xl font-bold">
            {loading ? '…' : error ? '—' : formatNumber(data?.total)}
          </strong>
          {t('shipper.tasks.results')}
        </p>
        {loading || error || !data?.list.length ? (
          <ResourceFeedback
            {...resource}
            empty="shipper.noTasks"
          />
        ) : (
          <Table
            className="min-w-[1100px]"
            aria-label={t('shipper.nav.tasks')}
          >
            <TableHeader>
              <TableRow>
                {['order', 'type', 'locker', 'assigned', 'status', 'actions'].map((key) => (
                  <TableHead
                    key={key}
                    className={`whitespace-nowrap px-5 py-4 font-semibold bg-[color-mix(in_oklab,var(--primary)_8%,var(--card))] dark:bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] ${key === 'actions' ? 'sticky right-0 z-10' : ''}`}
                  >
                    {t(`shipper.tasks.${key}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.list.map((row) => {
                const href = SHIPPER_ROUTES.TASK_DETAIL.replace(':orderId', row.id)
                return (
                  <TableRow key={row.id}>
                    <TableCell className="px-5 py-5">
                      <Link
                        to={href}
                        className="inline-block whitespace-nowrap rounded-lg bg-primary/10 px-3 py-2 font-bold text-primary hover:underline"
                      >
                        {row.orderCode}
                      </Link>
                      {row.merchantOrderCode && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {row.merchantOrderCode}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <DeliveryTypeBadge type={row.assignedTaskType} />
                    </TableCell>
                    <TableCell className="min-w-72 px-5 py-5">
                      <DeliveryLocker
                        {...taskLocker(row)}
                        fallback={t('shipper.tasks.seeDestination')}
                        autoBox={row.assignedTaskType === 2}
                        onOpenMap={() => setMapId(row.id)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-5">
                      {formatDateTime(row.shipperAssignedAt, 'Asia/Ho_Chi_Minh')}
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <OrderStatus status={row.status} />
                    </TableCell>
                    <TableCell className="sticky right-0 bg-card px-5 py-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={t('shipper.tasks.actions')}
                          />
                        )}
                        >
                          <MoreHorizontal size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            className="text-base"
                            render={<Link to={href} />}
                          >
                            <Eye size={17} />
                            {t('shipper.tasks.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-base"
                            disabled={blockedIds.includes(row.id)}
                            onClick={() => setActing(row)}
                          >
                            {row.assignedTaskType === 1 ? <PackageOpen size={17} /> : <Truck size={17} />}
                            {t(row.assignedTaskType === 1 ? 'shipper.tasks.confirmCollect' : 'shipper.tasks.confirmReturn')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {data && !loading && !error && (
          <TablePagination
            currentPage={query.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={TASK_TAKE}
            rowCount={data.list.length}
            onPageChange={(page) => update({ page })}
          />
        )}
      </section>
      {mapId && (
        <TaskMapDialog
          id={mapId}
          onClose={() => setMapId(null)}
        />
      )}
      {acting && (
        <TaskQuickAction
          row={acting}
          profile={profile}
          onClose={() => setActing(null)}
          onUnknown={() => setBlockedIds((ids) => [...new Set([...ids, acting.id])])}
          onSaved={() => {
            setActing(null); setRevision((value) => value + 1); profile.retry()
          }}
        />
      )}
    </Reveal>
  )
}
