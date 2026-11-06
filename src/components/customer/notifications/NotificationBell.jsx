import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ArrowUpRight, X } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { Button } from '~/components/ui/button'
import { CUSTOMER_ROUTES } from '~/utils/constants'
import { useNotifications } from './NotificationContext'
import NotificationInbox from './NotificationInbox'

export default function NotificationBell() {
  const { t } = useTranslation()
  const { unread } = useNotifications()
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root
      open={open}
      onOpenChange={setOpen}
    >
      <Popover.Trigger render={(
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full bg-primary/8 text-primary hover:bg-primary/15 hover:text-primary aria-expanded:bg-primary/15 aria-expanded:text-primary"
          aria-label={t('customer.notification.title')}
        />
      )}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={12}
          collisionPadding={12}
          className="z-50"
        >
          <Popover.Popup className="flex max-h-[min(75dvh,var(--available-height))] w-[min(480px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-xl outline-none">
            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-gradient-to-br from-primary/8 to-card p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Bell size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <Popover.Title className="text-xl font-bold">
                  {t('customer.notification.title')}
                </Popover.Title>
                <Popover.Description className="mt-1 text-xs text-muted-foreground">
                  {t('customer.notification.shortDescription')}
                </Popover.Description>
              </div>
              <Popover.Close render={(
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.close')}
                />
              )}
              >
                <X size={18} />
              </Popover.Close>
            </div>
            <div className="min-h-0 overflow-y-auto">
              <NotificationInbox
                compact
                onNavigate={() => setOpen(false)}
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                {t('customer.notification.latest')}
              </span>
              <Link
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                to={CUSTOMER_ROUTES.NOTIFICATIONS}
                onClick={() => setOpen(false)}
              >
                {t('customer.profile.allNotifications')}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
