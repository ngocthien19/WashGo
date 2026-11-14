import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import { SelectField } from '~/components/ui/select'
import { formatDateTime } from '~/utils/formats'
import { MERCHANT_ROUTES } from '~/utils/constants'

function HistoryContent({ id, audit }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, taskType: '', status: '' })
  const load = useCallback((signal) => audit ? merchantShipperApi.audits(id, signal) : merchantShipperApi.tasks(id, { page: query.page, take: 6, taskType: query.taskType ? Number(query.taskType) : undefined, status: query.status ? Number(query.status) : undefined }, signal), [id, audit, query])
  const resource = useCatalogResource(load)
  const items = audit ? resource.data : resource.data?.list
  return (
    <div
      data-pagination-scope
      className="mt-4 space-y-4"
    >
      {!audit && (
        <div className="workspace-filters grid gap-3 sm:grid-cols-2">
          {['taskType', 'status'].map((key) => (
            <SelectField
              key={key}
              label={t(`merchant.shipperSync.${key === 'taskType' ? 'taskTypeLabel' : 'taskStatus'}`)}
              value={query[key]}
              onValueChange={(value) => setQuery({ ...query, [key]: value, page: 1 })}
              options={[{ value: '', label: t('common.all') }, ...(key === 'taskType' ? [1, 2] : [1, 2, 3, 4]).map((value) => ({ value: String(value), label: t(`merchant.shipperSync.${key}.${value}`) }))]}
            />
          ))}
          <ClearFiltersButton
            className="sm:col-span-2"
            active={query.taskType || query.status}
            onClear={() => setQuery({ page: 1, taskType: '', status: '' })}
          />
        </div>
      )}
      {resource.loading || resource.error || !items?.length ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
          empty="merchant.shipperSync.noHistory"
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={audit ? item.id : item.taskId}
                className="space-y-2 py-3"
              >
                {audit ? (
                  <>
                    <p className="font-semibold">
                      {t(`merchant.shipperSync.auditAction.${item.action}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.actorName}
                      {' '}
                      ·
                      {' '}
                      {formatDateTime(item.createdAt)}
                    </p>
                    {item.reason && (
                      <p className="break-words text-sm">
                        {item.reason}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to={`${MERCHANT_ROUTES.ORDERS}/${item.orderId}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {item.merchantOrderCode || item.orderCode}
                    </Link>
                    <p className="text-sm">
                      {t(`merchant.shipperSync.taskType.${item.taskType}`)}
                      {' '}
                      ·
                      {' '}
                      {t(`merchant.shipperSync.status.${item.status}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.lockerName}
                      {item.boxNumber ? ` · ${t('customer.order.box', { number: item.boxNumber })}` : ''}
                    </p>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      {['assignedAt', 'completedAt', 'endedAt'].map((key) => (
                        <div key={key}>
                          <dt className="text-muted-foreground">
                            {t(`merchant.shipperSync.${key}`)}
                          </dt>
                          <dd className="font-medium">
                            {item[key] ? formatDateTime(item[key]) : '—'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!audit && (
            <TablePagination
              currentPage={query.page}
              totalPages={resource.data.totalPages}
              onPageChange={(page) => setQuery({ ...query, page })}
              className="border-0 p-0"
              total={resource.data.total}
              pageSize={6}
              rowCount={resource.data.list.length}
            />
          )}
        </>
      )}
    </div>
  )
}
export default function ShipperHistory({ id }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState({ tasks: false, audit: false })
  return (
    <div className="space-y-3">
      {['tasks', 'audit'].map((key) => (
        <details
          key={key}
          className="rounded-xl border border-border p-4"
          onToggle={(event) => {
            const expanded = event.currentTarget.open; setOpen((current) => ({ ...current, [key]: expanded }))
          }}
        >
          <summary className="cursor-pointer font-semibold">
            {t(`merchant.shipperSync.${key}`)}
          </summary>
          {open[key] && (
            <HistoryContent
              id={id}
              audit={key === 'audit'}
            />
          )}
        </details>
      ))}
    </div>
  )
}
