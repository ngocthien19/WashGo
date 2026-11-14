import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import Brand from '~/components/Brand/Brand'
import { Button } from '~/components/ui/button'

// The desktop sidebar stays in its layout; all roles share this mobile drawer.
export default function MobileSidebar({ open, onOpenChange, title, homeHref, id, children, footer }) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!open) {
      return
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) {
        onOpenChange(false)
      }
    }
    closeOnDesktop()
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [open, onOpenChange])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 transition-opacity duration-250 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none lg:hidden print:hidden" />
        <Dialog.Popup
          id={id}
          className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,calc(100vw-3rem))] flex-col border-r border-border bg-card text-foreground shadow-2xl outline-none transition-transform duration-250 ease-out data-starting-style:-translate-x-full data-ending-style:-translate-x-full motion-reduce:transition-none lg:hidden print:hidden"
        >
          <Dialog.Title className="sr-only">
            {title}
          </Dialog.Title>
          <div className="flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 pt-[env(safe-area-inset-top)]">
            <Brand
              to={homeHref}
              onClick={() => onOpenChange(false)}
            />
            <Dialog.Close render={(
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t('navigationDrawer.close')}
              />
            )}
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
            {children}
          </div>
          {footer && (
            <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
