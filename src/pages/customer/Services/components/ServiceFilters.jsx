import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Banknote, ChevronDown, RotateCcw, Shirt } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { SERVICE_PRICE_RANGES, SERVICE_TYPES, UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'

function FilterOptions({ id, title, icon: Icon, options, value, onChange }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="mt-6 border-t border-border pt-5 first:mt-0 first:border-0 first:pt-0">
      <h2
        id={id}
        className="mb-3 text-sm font-semibold"
      >
        <Button
          variant="ghost"
          className="h-auto w-full justify-between rounded-lg px-0 py-1 font-semibold hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
          aria-expanded={expanded}
          aria-controls={`${id}-options`}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="flex text-base items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </span>
          <ChevronDown className={cn('size-4', UI_TRANSITIONS.ICON, expanded && 'rotate-180')} />
        </Button>
      </h2>
      <div
        id={`${id}-options`}
        hidden={!expanded}
      >
        <RadioGroup
          name={id}
          value={value}
          onValueChange={onChange}
          aria-labelledby={id}
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted', UI_TRANSITIONS.BUTTON,
                option.value === value ? 'bg-primary/8 font-normal text-primary hover:bg-primary/12' : 'text-foreground/90')}
            >
              <RadioGroupItem
                value={option.value}
                aria-label={option.label}
              />
              <span>
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

export default function ServiceFilters({ value, onChange, onReset, hasFilters, minPrice, maxPrice, priceLabel, onPriceApply }) {
  const { t } = useTranslation()
  const selectedRange = SERVICE_PRICE_RANGES.find((range) => range.minPrice === minPrice && range.maxPrice === maxPrice)
  const priceOptions = SERVICE_PRICE_RANGES.map((range) => ({ ...range, label: t(range.label) }))
  if (!selectedRange) {
    priceOptions.push({ value: 'custom', label: priceLabel })
  }

  return (
    <aside
      aria-label={t('customer.serviceFilters')}
      className="self-start rounded-3xl border border-border/80 bg-card p-5 shadow-sm lg:sticky lg:top-[var(--customer-header-offset)] xl:p-6"
    >
      <div>
        <FilterOptions
          id="service-type-heading"
          title={t('customer.serviceType')}
          icon={Shirt}
          options={SERVICE_TYPES.map((type) => ({ ...type, label: t(type.label) }))}
          value={value}
          onChange={onChange}
        />
        <FilterOptions
          id="service-price-heading"
          title={t('customer.serviceCatalog.priceRange')}
          icon={Banknote}
          options={priceOptions}
          value={selectedRange?.value ?? 'custom'}
          onChange={(next) => {
            const range = SERVICE_PRICE_RANGES.find((option) => option.value === next)
            if (range) {
              onPriceApply({ minPrice: range.minPrice, maxPrice: range.maxPrice })
            }
          }}
        />
        <div className="mt-6 border-t border-border pt-5">
          <Button
            variant="destructive"
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
