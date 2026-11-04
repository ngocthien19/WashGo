import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { SERVICE_TYPES, UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function ServiceFilters({ value, onChange, onReset, hasFilters }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)

  return (
    <aside
      aria-label={t('customer.serviceFilters')}
      className="self-start rounded-3xl border border-border/80 bg-card p-5 shadow-sm lg:sticky lg:top-[var(--customer-header-offset)] xl:p-6"
    >
      <Button
        variant="ghost"
        className="h-auto w-full justify-between gap-2 rounded-xl px-0 py-1 hover:bg-transparent hover:text-primary aria-expanded:bg-transparent"
        aria-expanded={expanded}
        aria-controls="service-filter-options"
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="flex items-center gap-2.5 text-lg font-bold">
          <SlidersHorizontal
            size={19}
            className="text-primary"
            aria-hidden="true"
          />
          {t('customer.filters')}
        </span>
        <ChevronDown className={cn(UI_TRANSITIONS.ICON, expanded && 'rotate-180')} />
      </Button>
      <div
        id="service-filter-options"
        hidden={!expanded}
      >
        <h2
          id="service-type-heading"
          className="mb-3 mt-7 text-sm font-semibold"
        >
          {t('customer.serviceType')}
        </h2>
        <RadioGroup
          name="service-type"
          value={value}
          onValueChange={onChange}
          aria-labelledby="service-type-heading"
        >
          {SERVICE_TYPES.map((type) => (
            <label
              key={type.value}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-primary/5', UI_TRANSITIONS.BUTTON, type.value === value ? 'bg-primary/8 font-semibold text-primary' : 'font-medium text-foreground/80')}
            >
              <RadioGroupItem
                value={type.value}
                aria-label={t(type.label)}
              />
              <span>
                {t(type.label)}
              </span>
            </label>
          ))}
        </RadioGroup>
        <div className="mt-6 border-t border-border pt-5">
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl disabled:opacity-65"
            disabled={!hasFilters}
            onClick={onReset}
          >
            <RotateCcw size={15} />
            {t('customer.clearFilters')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
