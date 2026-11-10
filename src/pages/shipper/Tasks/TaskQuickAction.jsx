import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { canCompleteTask } from './taskModel'
import TaskActionDialog from './TaskActionDialog'

export default function TaskQuickAction({ row, profile, onClose, onSaved, onUnknown }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(useCallback((signal) => shipperTaskApi.detail(row.id, signal), [row.id]))
  if (!resource.loading && !profile.loading && !resource.error && !profile.error && resource.data?.assignedTaskType === row.assignedTaskType && canCompleteTask(resource.data, profile.data?.id)) {
    return (
      <TaskActionDialog
        order={resource.data}
        shipperId={profile.data.id}
        onClose={onClose}
        onSaved={onSaved}
        onUnknown={onUnknown}
      />
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="[&_button]:text-base"
        ready={!resource.loading && !profile.loading}
        closeLabel="common.close"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl font-bold">
            {t(row.assignedTaskType === 1 ? 'shipper.tasks.confirmCollect' : 'shipper.tasks.confirmReturn')}
          </DialogTitle>
        </DialogHeader>
        <ResourceFeedback
          error={resource.error || profile.error || 'shipper.tasks.changed'}
          retry={() => {
            resource.retry(); profile.retry()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
