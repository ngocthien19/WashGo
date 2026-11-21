import { Home, LockKeyhole, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

export default function SessionEndedDialog({ issue, reason, onClose, onHome }) {
  const { t } = useTranslation()
  if (!['locked', 'deleted', 'sessionEnded'].includes(issue)) {
    return null
  }
  const Icon = issue === 'locked' ? LockKeyhole : ShieldAlert
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent closeLabel="common.close">
        <DialogHeader tone="danger">
          <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-bold">
            <Icon aria-hidden="true" />
            {t(`auth.accountAccess.${issue}Title`)}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="py-6 text-base leading-relaxed text-muted-foreground">
          {t(`auth.accountAccess.${issue}Description`)}
        </DialogDescription>
        {['locked', 'deleted'].includes(issue) && (
          <div className="mb-6 space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-400/30 dark:bg-red-500/10">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
              {t(`auth.accountAccess.${issue}Reason`)}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {reason || t('auth.accountAccess.noReason')}
            </p>
          </div>
        )}
        <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
          <Button
            variant="secondary"
            className="h-11 min-w-24 text-base"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
          <Button
            className="h-11 px-5 text-base"
            onClick={onHome}
          >
            <Home
              size={18}
              aria-hidden="true"
            />
            {t('auth.accountAccess.home')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
