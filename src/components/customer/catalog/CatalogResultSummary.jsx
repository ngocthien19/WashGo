import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { formatNumber } from '~/utils/formats'

export default function CatalogResultSummary({ title, count, range, sortControl, actions, icon: Icon, filters = [], onRemoveFilter, onClearFilters }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4 px-5 py-5 sm:px-6">
        <div
          role="status"
          className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground sm:text-base"
        >
          {Icon && (
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon
                size={21}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </span>
          )}
          <p>
            {Number.isFinite(count) && (
              <>
                <strong className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatNumber(count)}
                </strong>
                {' '}
              </>
            )}
            {title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          {actions}
          {sortControl && (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-muted-foreground">
                {t('customer.sortBy')}
              </span>
              {sortControl}
            </div>
          )}
          {range && (
            <p className="text-xs tabular-nums text-muted-foreground sm:text-sm">
              {range}
            </p>
          )}
        </div>
      </div>
      {filters.length > 0 && (
        <div
          role="group"
          aria-label={t('customer.activeFilters')}
          className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/15 px-5 py-3 sm:px-6"
        >
          {filters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-violet-200 bg-violet-50 py-1 pl-3 pr-1 text-xs text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-200"
            >
              <span className="max-w-[min(17rem,60vw)] truncate">
                {filter.label}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full text-violet-600 hover:bg-violet-200/70 hover:text-violet-900 dark:text-violet-200 dark:hover:bg-violet-400/25 dark:hover:text-violet-100"
                aria-label={t('customer.removeFilter', { label: filter.label })}
                onClick={() => onRemoveFilter(filter.id)}
              >
                <X size={13} />
              </Button>
            </span>
          ))}
          <Button
            variant="destructive"
            className="h-8 rounded-full px-3"
            onClick={onClearFilters}
          >
            {t('customer.clearAllFilters')}
          </Button>
        </div>
      )}
    </div>
  )
}
