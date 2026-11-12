import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

export default function ActionConfirmationDialog({ title, description, icon: Icon, tone = 'info', children, pending, disabled, error, onClose, onConfirm, confirmLabel }) {
  const { t } = useTranslation()
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !pending) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-xl"
        closeLabel="common.close"
      >
        <DialogHeader tone={tone}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Icon />
            {title}
          </DialogTitle>
          <DialogDescription className="mt-4 text-base leading-6 text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          {children}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 p-4 text-base text-destructive"
          >
            {t(error)}
          </p>
        )}
        <footer className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={onClose}
            className="h-11 px-5 text-base"
          >
            {t('common.close')}
          </Button>
          <Button
            variant={tone === 'danger' ? 'destructive' : 'default'}
            disabled={pending || disabled}
            onClick={onConfirm}
            className="h-11 px-5 text-base"
          >
            {confirmLabel || t('common.confirm')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
