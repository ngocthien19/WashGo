import { useTranslation } from 'react-i18next'
import { ArrowDownUp, Check, ChevronDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { SERVICE_SORT_OPTIONS, UI_TRANSITIONS } from '~/utils/constants'

export default function ServiceSort({ value, onChange }) {
  const { t } = useTranslation()
  const selected = SERVICE_SORT_OPTIONS.find((option) => option.value === value) || SERVICE_SORT_OPTIONS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <Button
            variant="outline"
            className="h-10 min-w-44 justify-between gap-3 rounded-xl"
            aria-label={t('customer.serviceCatalog.sortServices')}
          />
        )}
      >
        <span className="flex text-base items-center gap-2">
          <ArrowDownUp size={16} />
          {t(selected.label)}
        </span>
        <ChevronDown className={`size-4 in-aria-expanded:rotate-180 ${UI_TRANSITIONS.ICON}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {SERVICE_SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            aria-current={option.value === value ? 'true' : undefined}
            onClick={() => onChange(option.value)}
          >
            <ArrowDownUp size={16} />
            {t(option.label)}
            {option.value === value && (
              <Check className="ml-auto size-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
