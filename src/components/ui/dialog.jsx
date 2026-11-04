import { useTranslation } from 'react-i18next'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '~/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({ children, className, closeLabel = 'common.closeServiceDetails' }) {
  const { t } = useTranslation()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/45" />
      <DialogPrimitive.Popup className={cn('fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl outline-none sm:p-8', className)}>
        <DialogPrimitive.Close
          render={(
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              aria-label={t(closeLabel)}
            />
          )}
        >
          <X size={18} />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}
