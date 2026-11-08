import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, X } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { Button } from '~/components/ui/button'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import { validDashboardRange } from '~/utils/dashboardQuery'

export default function DashboardFilters({ range, onChange }) {
  const { t } = useTranslation()
  const [custom, setCustom] = useState(false)
  const [error, setError] = useState(false)
  return (
    <Popover.Root
      open={custom}
      onOpenChange={setCustom}
    >
      <div
        className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1"
        aria-label={t('merchant.sync.dashboardPeriod')}
      >
        {['day', 'week', 'month', 'custom'].map((mode) => {
          const label = t(`merchant.reports.periods.${mode}`)
          const button = (
            <Button
              key={mode}
              variant={mode === range.mode ? 'default' : 'ghost'}
              className="h-9 rounded-lg px-3 text-sm font-semibold"
              aria-pressed={mode === range.mode}
              onClick={() => {
                setError(false); if (mode !== 'custom') {
                  setCustom(false); onChange({ mode })
                }
              }}
            >
              {label}
            </Button>
          )
          return mode === 'custom' ? (
            <Popover.Trigger
              key={mode}
              render={button}
            >
              {label}
            </Popover.Trigger>
          ) : button
        })}
      </div>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={12}
          collisionPadding={12}
          className="z-50"
        >
          <Popover.Popup className="max-h-[min(75dvh,var(--available-height))] w-[min(480px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-xl outline-none">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays size={21} />
              </span>
              <Popover.Title className="flex-1 text-lg font-bold">
                {t('merchant.reports.customRange')}
              </Popover.Title>
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
            <Popover.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('merchant.sync.customDateHelp')}
            </Popover.Description>
            <DateRangeFilter
              key={`${range.from}-${range.to}-${custom}`}
              from={range.from}
              to={range.to}
              label="merchant.sync.dashboardPeriod"
              className="mt-4 space-y-3 border-t border-border pt-4 [&>div]:sm:grid-cols-2"
              onApply={({ from, to }) => {
                if (!from && !to) {
                  setCustom(false); setError(false); onChange({ mode: 'month' }); return
                }
                if (!validDashboardRange(from, to)) {
                  setError(true); return
                }
                setError(false); setCustom(false); onChange({ mode: 'custom', from, to })
              }}
            />
            {error && (
              <p
                role="alert"
                className="mt-3 text-sm text-destructive"
              >
                {t('merchant.reports.invalidRange')}
              </p>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
