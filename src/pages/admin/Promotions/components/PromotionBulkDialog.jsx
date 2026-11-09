import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Power, Trash2, Info, Ticket } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { statusClass } from '../promotionModel'

// No single-promotion mutations here: execution requires a real batch endpoint.
export default function PromotionBulkDialog({ promotions, onClose }) {
  const { t } = useTranslation()
  const [action, setAction] = useState('deactivate')
  const eligible = value => action === 'delete' ? value.usedCount === 0 : value.isActive === (action === 'deactivate')
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
            {t('admin.promotions.bulk.title')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t('admin.promotions.bulk.selected', { count: promotions.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-5">
          <div
            role="tablist"
            aria-label={t('admin.promotions.bulk.title')}
            className="flex flex-wrap gap-2 border-b border-border"
          >
            {['deactivate', 'activate', 'delete'].map(key => (
              <Button
                key={key}
                role="tab"
                aria-selected={action === key}
                variant="ghost"
                onClick={() => setAction(key)}
                className={`h-12 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 text-base font-medium hover:bg-transparent dark:hover:bg-transparent ${key === action ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
              >
                {key === 'delete' ? <Trash2 size={17} /> : <Power size={17} />}
                {t(`admin.promotions.${key}`)}
              </Button>
            ))}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {t(action === 'delete' ? 'admin.promotions.deleteHint' : 'admin.promotions.statusHint')}
          </p>
          <ul
            className="max-h-72 space-y-3 overflow-y-auto pr-1"
            aria-label={t('admin.promotions.bulk.list')}
          >
            {promotions.map(value => (
              <li
                key={value.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Ticket size={23} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-primary">
                    {value.code}
                  </p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {value.description || '—'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(eligible(value) ? 'admin.promotions.bulk.eligible' : 'admin.promotions.bulk.skipped')}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(value.status)}`}>
                  {t(`admin.promotions.statuses.${value.status}`)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">
            {t('admin.promotions.bulk.affected', { count: promotions.filter(eligible).length })}
          </p>
          <p
            role="status"
            className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200"
          >
            <Info
              size={19}
              className="mt-0.5 shrink-0"
            />
            {t('admin.promotions.bulk.unavailable')}
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
              className="h-11 px-5 text-base"
            >
              {t(`admin.promotions.${action}`)}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
