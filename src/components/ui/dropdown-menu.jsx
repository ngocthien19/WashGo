import { Menu } from '@base-ui/react/menu'
import { cn } from '~/lib/utils'
import { CHOICE_ITEM_STYLES, UI_TRANSITIONS } from '~/utils/constants'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({ children, className, ...props }) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        align="end"
        sideOffset={8}
        className="z-50"
      >
        <Menu.Popup
          className={cn('w-64 origin-top-right rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none', className)}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <Menu.Item
      className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm outline-none data-highlighted:bg-muted data-disabled:cursor-not-allowed data-disabled:opacity-50', CHOICE_ITEM_STYLES, UI_TRANSITIONS.BUTTON, className)}
      {...props}
    />
  )
}
