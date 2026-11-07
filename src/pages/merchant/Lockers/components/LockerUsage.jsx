import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import OrderStatus from '~/components/orders/OrderStatus'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantLockerApi } from '~/apis/merchant/merchantLockerApi'
import { dateRangeFilter } from '~/utils/dateRange'
import { formatDateTime } from '~/utils/formats'
import { MERCHANT_ROUTES } from '~/utils/constants'
import { HISTORY_TAKE } from '../lockerModel'

export default function LockerUsage({ locker }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, boxId: '', from: '', to: '' })
  const load = useCallback((signal) => merchantLockerApi.history(locker.id, { page: query.page, take: HISTORY_TAKE, boxId: query.boxId || undefined, ...dateRangeFilter(query) }, signal), [locker.id, query])
  const resource = useCatalogResource(load)
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4">
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span>
            {t('merchant.lockers.filterBox')}
          </span>
          <SelectField
            label={t('merchant.lockers.filterBox')}
            value={query.boxId}
            onValueChange={(boxId) => setQuery({ ...query, boxId, page: 1 })}
            options={[{ value: '', label: t('common.all') }, ...locker.boxes.map((box) => ({ value: box.id, label: t('customer.order.box', { number: box.boxNumber }) }))]}
          />
        </label>
        <DateRangeFilter
          from={query.from}
          to={query.to}
          label="merchant.lockers.usageRange"
          className="grid gap-3"
          onApply={(range) => setQuery({ ...query, ...range, page: 1 })}
        />
      </div>
      {resource.loading || resource.error || !resource.data?.list.length ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
          empty="merchant.lockers.noHistory"
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('merchant.lockers.usageCount', { count: resource.data.total })}
          </p>
          <Table
            className="min-w-[690px] text-sm"
            aria-label={t('merchant.lockers.history')}
          >
            <TableHeader>
              <TableRow>
                {['order', 'box', 'usageType', 'putInAt', 'takenOutAt', 'orderStatus'].map((key) => (
                  <TableHead key={key}>
                    {t(`merchant.lockers.${key}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resource.data.list.map((row, index) => (
                <TableRow key={`${row.orderId}-${row.usageType}-${row.boxNumber}-${index}`}>
                  <TableCell>
                    <Link
                      to={`${MERCHANT_ROUTES.ORDERS}/${row.orderId}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.orderCode}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {row.boxNumber}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      {row.usageType === 1 ? (
                        <ArrowDownToLine
                          size={16}
                          className="text-primary"
                        />
                      ) : (
                        <ArrowUpFromLine
                          size={16}
                          className="text-emerald-600"
                        />
                      )}
                      {t(`merchant.lockers.usageTypes.${row.usageType}`)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(row.putInAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(row.takenOutAt)}
                  </TableCell>
                  <TableCell>
                    <OrderStatus status={row.orderStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            currentPage={query.page}
            totalPages={resource.data.totalPages}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  )
}
