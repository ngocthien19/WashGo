import ClearFiltersButton from '~/components/ClearFiltersButton'
import { TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminWorkspaceApi } from '~/apis/admin/adminWorkspaceApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import { SelectField } from '~/components/ui/select'
import { formatDateTime, formatDurationMinutes } from '~/utils/formats'
import { ADMIN_ROUTES } from '~/utils/constants'

export default function AdminAlerts({ revision }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1), [type, setType] = useState(''), [severity, setSeverity] = useState('')
  const take = 5
  const resource = useCatalogResource(useCallback(signal => adminWorkspaceApi.alerts({ page, take, type: type || undefined, severity: severity || undefined }, signal), [page, type, severity]), revision)
  const value = resource.data
  return (
    <section
      data-pagination-scope
      className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-sm"
    >
      <h2 className="flex items-center gap-3 border-b border-primary/15 bg-primary/5 p-5 text-lg font-bold">
        <TriangleAlert className="size-5 shrink-0 text-amber-600" />
        {t('admin.workspaceSync.alerts')}
      </h2>
      {resource.loading || resource.error || !value ? (
        <ResourceFeedback
          {...resource}
          loadingText="admin.loading"
        />
      ) : (
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            {t('admin.workspaceSync.ruleAlerts', { count: value.totalAll })}
          </p>
          <div className="flex flex-wrap gap-2">
            {value.summary.map(row => (
              <span
                key={`${row.type}-${row.severity}`}
                className="rounded-lg bg-muted px-3 py-2 text-sm"
              >
                {t(`admin.workspaceSync.alertTypes.${row.type}`)}
                {' '}
                ·
                {' '}
                <strong>
                  {row.count}
                </strong>
              </span>
            ))}
          </div>
          <div className="workspace-filters grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <label className="grid gap-2">
              {t('admin.workspaceSync.alertType')}
              <SelectField
                label={t('admin.workspaceSync.alertType')}
                value={type}
                onValueChange={v => {
                  setType(v); setPage(1)
                }}
                options={[{ value: '', label: t('common.all') }, ...Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: t(`admin.workspaceSync.alertTypes.${i + 1}`) }))]}
              />
            </label>
            <label className="grid gap-2">
              {t('admin.workspaceSync.severity')}
              <SelectField
                label={t('admin.workspaceSync.severity')}
                value={severity}
                onValueChange={v => {
                  setSeverity(v); setPage(1)
                }}
                options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map(i => ({ value: String(i), label: t(`admin.workspaceSync.severities.${i}`) }))]}
              />
            </label>
          </div>
          <ClearFiltersButton
            active={type || severity}
            onClear={() => {
              setType(''); setSeverity(''); setPage(1)
            }}
          />
          <h3 className="font-semibold">
            {t('admin.workspaceSync.alertResults', { count: value.total })}
          </h3>
          {!value.items.length ? (
            <p>
              {t('admin.noData')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {value.items.map(row => {
                const href = row.resourceType === 'Order' ? `${ADMIN_ROUTES.ORDERS}/${row.resourceId}` : row.resourceType === 'Incident' ? `${ADMIN_ROUTES.COMPLAINTS}/${row.resourceId}` : row.resourceType === 'Locker' ? `${ADMIN_ROUTES.LOCKERS}?locker=${row.resourceId}` : `${ADMIN_ROUTES.MERCHANTS}?merchant=${row.resourceId}`
                return (
                  <li
                    key={`${row.type}-${row.resourceId}`}
                    className="space-y-2 py-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <Link
                        to={href}
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.resourceCode}
                      </Link>
                      <span className={`rounded-full px-3 py-1 text-sm ${row.severity === 3 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>
                        {t(`admin.workspaceSync.severities.${row.severity}`)}
                      </span>
                    </div>
                    <p>
                      {t(`admin.workspaceSync.alertTypes.${row.type}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(row.deadline)}
                      {' '}
                      ·
                      {' '}
                      {formatDurationMinutes(row.overdueMinutes)}
                    </p>
                    {row.availableBoxes != null && (
                      <p>
                        {t('admin.workspaceSync.availableBoxes', { count: row.availableBoxes, total: row.totalBoxes })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {value.total > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={Math.ceil(value.total / take)}
              total={value.total}
              pageSize={take}
              rowCount={value.items.length}
              onPageChange={setPage}
              className="px-0 pb-0"
            />
          )}
        </div>
      )}
    </section>
  )
}
