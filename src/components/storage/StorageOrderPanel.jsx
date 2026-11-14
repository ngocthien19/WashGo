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

function LoadedStorageOrderPanel({ order, role, onUpdated, taskId }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1), [action, setAction] = useState(null)
  const resource = useCatalogResource(useCallback(signal => storageApi.cycles(order.id, page, signal), [order.id, page]), order.revision)
  const done = () => {
    setAction(null); resource.retry(); onUpdated?.()
  }
  return (
    <section
      data-pagination-scope
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="flex items-center gap-3 text-xl font-bold">
        <Warehouse className="text-primary" />
        {t('storage.title')}
      </h2>
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
          <Pagination
            currentPage={page}
            totalPages={resource.data?.totalPages || 0}
            onPageChange={setPage}
          />
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
          onClose={done}
          onSaved={done}
        />
      )}
    </section>
  )
}

export default function StorageOrderPanel(props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const historyOnly = props.role !== 'Shipper' && ![10, 13, 14, 15].includes(props.order.status)
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
  return <LoadedStorageOrderPanel {...props} />
}
