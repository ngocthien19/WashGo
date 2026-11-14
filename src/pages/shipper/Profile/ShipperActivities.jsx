import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import { shipperWorkspaceApi } from '~/apis/shipper/shipperWorkspaceApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import ShipperPanel from '../components/ShipperPanel'
import { formatDateTime } from '~/utils/format/formats'
export default function ShipperActivities({ revision = 0 }) {
  const { t } = useTranslation(), [page, setPage] = useState(1)
  const resource = useCatalogResource(useCallback(signal => shipperWorkspaceApi.activities({ page, take: 5 }, signal), [page]), revision)
  return (
    <ShipperPanel
      data-pagination-scope
      title={t('admin.workspaceSync.audit')}
      icon={History}
    >
      {resource.loading || resource.error || !resource.data ? <ResourceFeedback {...resource} /> : (
        <>
          <ul className="divide-y divide-border px-5">
            {resource.data.list.map(row => (
              <li
                className="flex flex-wrap justify-between gap-3 py-4"
                key={row.id}
              >
                <span className="font-medium">
                  {row.module}
                  {' '}
                  {'\u00b7'}
                  {' '}
                  {row.action}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(row.occurredAt)}
                </span>
                <span className="text-sm">
                  {t(`admin.workspaceSync.results.${row.result}`)}
                </span>
              </li>
            ))}
          </ul>
          <TablePagination
            currentPage={page}
            totalPages={Math.ceil(resource.data.total / 5)}
            total={resource.data.total}
            pageSize={5}
            rowCount={resource.data.list.length}
            onPageChange={setPage}
          />
        </>
      )}
    </ShipperPanel>
  )
}
