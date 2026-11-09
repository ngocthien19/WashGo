import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Power, Trash2, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'

// Wait for a real batch endpoint; never emulate a batch by calling single-service mutations.
export default function ServiceBulkDialog({ services, onClose }) {
  const { t } = useTranslation()
  const [action, setAction] = useState('pause')
  const affected = services.filter(service => action === 'delete' || service.approvalStatus === 2 && service.isActive === (action === 'pause'))
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-2xl"
        closeLabel="common.close"
      >
        <DialogHeader tone={action === 'delete' ? 'danger' : action === 'activate' ? 'success' : 'warning'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Layers className="text-primary" />
            {t('admin.services.bulk')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t('admin.services.selected', { count: services.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-5">
          <div
            role="tablist"
            aria-label={t('admin.services.bulk')}
            className="flex flex-wrap gap-2 border-b border-border"
          >
            {['pause', 'activate', 'delete'].map(key => (
              <Button
                key={key}
                variant="ghost"
                role="tab"
                aria-selected={action === key}
                onClick={() => setAction(key)}
                className={`h-12 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 text-base font-medium hover:bg-transparent dark:hover:bg-transparent ${key === action ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
              >
                {key === 'delete' ? <Trash2 size={17} /> : <Power size={17} />}
                {t(`admin.services.bulkActions.${key}`)}
              </Button>
            ))}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {t(action === 'delete' ? 'admin.services.deleteHint' : 'admin.services.bulkStatusHint')}
          </p>
          <ul
            className="max-h-72 space-y-3 overflow-y-auto pr-1"
            aria-label={t('admin.services.selectedList')}
          >
            {services.map(service => (
              <li
                key={service.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
              >
                <ResourceThumbnail
                  urls={service.imageUrls}
                  name={service.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">
                    {service.code}
                  </p>
                  <p className="mt-1 break-words font-semibold">
                    {service.name}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(`merchant.services.activity.${service.isActive}`)}
                    {!affected.some(item => item.id === service.id) && ` · ${t('admin.services.bulkSkipped')}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">
            {t('admin.services.bulkAffected', { count: affected.length })}
          </p>
          <p
            role="status"
            className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200"
          >
            <Info
              size={19}
              className="mt-0.5 shrink-0"
            />
            {t('admin.services.bulkUnavailable')}
          </p>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              variant={action === 'delete' ? 'destructive' : 'default'}
              disabled
              className="h-11 px-6 text-base"
            >
              {t(`admin.services.bulkActions.${action}`)}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
