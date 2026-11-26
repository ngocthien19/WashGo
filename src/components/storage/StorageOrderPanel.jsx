import useOrderRealtime from '~/hooks/useOrderRealtime'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Warehouse } from 'lucide-react'
import { storageApi } from '~/apis/storage/storageApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import { Button } from '~/components/ui/button'
import StorageCycleCard from './StorageCycleCard'
import StorageActionDialog from './StorageActionDialog'

function LoadedStorageOrderPanel({ order, role, onUpdated, taskId, resource, page, setPage }) {
  const { t } = useTranslation()
  const [action, setAction] = useState(null)
  const done = () => {
    setAction(null); resource.retry(); onUpdated?.()
  }
  return (
    <section
      data-pagination-scope
      className={role === 'Admin' ? 'overflow-hidden rounded-2xl border border-border bg-card shadow-sm' : 'space-y-4 rounded-2xl border border-border bg-card p-5'}
    >
      <h2 className={role === 'Admin' ? 'flex items-center gap-3 border-b border-border bg-teal-500/5 p-5 text-lg font-semibold' : 'flex items-center gap-3 text-xl font-bold'}>
        <Warehouse className={role === 'Admin' ? 'size-5 text-teal-700 dark:text-teal-300' : 'text-primary'} />
        {t('storage.title')}
      </h2>
      <div className={role === 'Admin' ? 'space-y-5 p-5 sm:p-6' : 'space-y-4'}>
        {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : (
          <>
            {(resource.data?.list || []).map((row, index) => (
              <StorageCycleCard
                key={row.id}
                row={row}
                current={order.activeStorageCycleId ? row.id === order.activeStorageCycleId : page === 1 && index === 0}
                role={role}
                taskId={taskId}
                disabled={storageApi.hasPending(order.id)}
                onAction={name => setAction({ name, cycle: row })}
              />
            ))}
            {storageApi.hasPending(order.id) && (
              <Button
                variant="outline"
                onClick={() => setAction({ name: 'exception', cycle: resource.data?.list[0] })}
              >
                {t('admin.sync.checkResult')}
              </Button>
            )}
            {!resource.data?.list.length && (
              <p className="text-muted-foreground">
                {t('storage.noCycles')}
              </p>
            )}
            {resource.data?.totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={resource.data.totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
        {role === 'Admin' && order.storageWorkflowVersion === 0 && order.status === 13 && (
          <Button
            variant="outline"
            onClick={() => setAction({ name: 'verify-legacy' })}
          >
            {t('storage.actions.verify-legacy')}
          </Button>
        )}
        {action && (
          <StorageActionDialog
            order={order}
            cycle={action.cycle}
            action={action.name}
            taskId={taskId}
            role={role}
            onClose={() => setAction(null)}
            onSaved={done}
          />
        )}
      </div>
    </section>
  )
}

export default function StorageOrderPanel(props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const liveRevision = useOrderRealtime(props.order.id)
  const resource = useCatalogResource(useCallback(signal => storageApi.cycles(props.order.id, page, signal), [props.order.id, page]), `${props.order.revision}:${liveRevision}`)
  const historyOnly = props.role !== 'Shipper' && ![10, 13, 14, 15].includes(props.order.status)
  if (historyOnly) {
    if (resource.loading || resource.error) {
      return <ResourceFeedback {...resource} />
    }
    if (!resource.data?.list.length) {
      return null
    }
  }
  if (historyOnly && !expanded) {
    return (
      <Button
        variant="outline"
        className="h-11"
        onClick={() => setExpanded(true)}
      >
        {t('storage.history')}
      </Button>
    )
  }
  return (
    <LoadedStorageOrderPanel
      {...props}
      resource={resource}
      page={page}
      setPage={setPage}
    />
  )
}
