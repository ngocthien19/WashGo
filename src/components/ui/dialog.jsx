import { useTranslation } from 'react-i18next'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '~/lib/utils'
import { UI_MOTION } from '~/utils/constants'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

const headerTones = {
  info: 'before:bg-primary/60 [&_h2>svg]:bg-primary/10 [&_h2>svg]:text-primary',
  danger: 'before:bg-red-400 [&_h2>svg]:bg-red-500/10 [&_h2>svg]:text-red-600 dark:[&_h2>svg]:text-red-300',
  warning: 'before:bg-amber-400 [&_h2>svg]:bg-amber-500/10 [&_h2>svg]:text-amber-700 dark:[&_h2>svg]:text-amber-300',
  success: 'before:bg-emerald-400 [&_h2>svg]:bg-emerald-500/10 [&_h2>svg]:text-emerald-700 dark:[&_h2>svg]:text-emerald-300'
}
export function DialogHeader({ children, tone = 'info', className }) {
  return (
    <header
      data-dialog-header
      data-tone={tone}
      className={cn('relative -mx-6 -mt-6 border-b border-primary/10 bg-[color-mix(in_srgb,var(--primary)_3%,var(--card))] px-6 py-5 before:absolute before:bottom-0 before:left-6 before:h-0.5 before:w-12 before:rounded-full sm:-mx-8 sm:-mt-8 sm:px-8 sm:before:left-8 [&_h2>svg]:size-10 [&_h2>svg]:shrink-0 [&_h2>svg]:rounded-xl [&_h2>svg]:p-2', headerTones[tone] || headerTones.info, className)}
    >
      {children}
    </header>
  )
}

export function DialogContent({ children, className, closeLabel = 'common.closeServiceDetails', ready = true, ...props }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const transition = { duration: reduceMotion ? 0 : UI_MOTION.MODAL_DURATION, ease: UI_MOTION.EASE }
  // Mount the animated popup once its initial content is ready, avoiding a small loading modal that jumps in size.
  if (!ready) {
    return null
  }
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/45"
        render={(
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition}
          />
        )}
      />
      <DialogPrimitive.Popup
        {...props}
        className={cn('fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl outline-none sm:p-8', className)}
        render={(
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={transition}
          />
        )}
      >
        <DialogPrimitive.Close
          render={(
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-20"
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
