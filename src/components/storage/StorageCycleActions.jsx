import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'

export default function StorageCycleActions({ row, role, taskId, onAction, disabled, current = true, menu = false, className, actionNames }) {
  const { t } = useTranslation()
  const coordinator = ['Admin', 'Merchant'].includes(role)
  const actions = coordinator
    ? [['assign', row.canAssign], ['cancel-assignment', row.canCancelAssignment], ['exception', current && ![5, 6].includes(row.state)]]
    : role === 'Shipper' && row.taskId === taskId
      ? [['collect', row.canCollect], ['handover', row.canHandover], ['depart', row.canDepart], ['place', row.canPlace]] : []
  return actions.filter(([name, enabled]) => enabled && (!actionNames || actionNames.includes(name))).map(([name]) => menu ? (
    <DropdownMenuItem
      key={name}
      disabled={disabled}
      onClick={() => onAction(name)}
      className={name === 'exception' ? 'text-rose-600 dark:text-rose-300' : undefined}
    >
      {name === 'exception' && (
        <ShieldAlert
          size={17}
          aria-hidden="true"
        />
      )}
      {t(`storage.actions.${name}`)}
    </DropdownMenuItem>
  ) : (
    <Button
      key={name}
      disabled={disabled}
      className={cn('h-10 rounded-xl text-sm', className)}
      variant={name === 'assign' ? 'default' : name === 'exception' ? 'destructive' : 'outline'}
      onClick={() => onAction(name)}
    >
      {t(`storage.actions.${name}`)}
    </Button>
  ))
}
