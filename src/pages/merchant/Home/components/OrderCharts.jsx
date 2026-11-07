import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartNoAxesCombined } from 'lucide-react'
import { formatNumber } from '~/utils/formats'
import { groupOrders } from '../dashboardModel'

export default function OrderCharts({ counts, aside }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(null)
  const groups = groupOrders(counts)
  const total = groups.reduce((sum, group) => sum + group.value, 0)
  const max = Math.max(1, ...groups.map((group) => group.value))
  const selected = groups.find((group) => group.key === active)
  if (!total) {
    return (
      <div className="grid items-stretch gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="grid min-h-64 place-items-center rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <div>
            <ChartNoAxesCombined className="mx-auto mb-3 size-10 text-primary/50" />
            <p>
              {t('merchant.emptyChart')}
            </p>
          </div>
        </div>
        {aside}
      </div>
    )
  }
  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-[1.2fr_1fr]">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="border-b border-primary/15 pb-4 text-lg font-bold text-foreground">
          {t('merchant.statusDistribution')}
        </h2>
        <div
          className="mt-6 space-y-5"
          role="img"
          aria-label={t('merchant.statusDistribution')}
        >
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <span>
                  {t(`merchant.groups.${group.key}`)}
                </span>
                <strong className="tabular-nums">
                  {formatNumber(group.value)}
                </strong>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${group.value / max * 100}%`, backgroundColor: group.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      {aside}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="border-b border-violet-500/15 pb-4 text-lg font-bold text-foreground">
          {t('merchant.orderComposition')}
        </h2>
        <div className="relative mx-auto my-6 size-56">
          <svg
            viewBox="0 0 200 200"
            className="size-full -rotate-90"
            aria-hidden="true"
          >
            {groups.filter((group) => group.value > 0).map((group, index, visible) => {
              const length = group.value / total * 100
              const start = visible.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) / total * 100
              return (
                <circle
                  key={group.key}
                  cx="100"
                  cy="100"
                  r="75"
                  fill="none"
                  stroke={group.color}
                  strokeWidth={24}
                  pathLength={100}
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={-start}
                  opacity={active && active !== group.key ? 0.25 : 1}
                />
              )
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <strong className="text-3xl font-bold tabular-nums">
              {formatNumber(selected?.value ?? total)}
            </strong>
            <span className="mt-1 max-w-32 text-xs text-muted-foreground">
              {t(selected ? `merchant.groups.${selected.key}` : 'merchant.totalOrders')}
            </span>
          </div>
        </div>
        <div
          className="grid gap-1 sm:grid-cols-2"
          onMouseLeave={() => setActive(null)}
        >
          {groups.map((group) => (
            <button
              type="button"
              key={group.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              onMouseEnter={() => setActive(group.key)}
              onFocus={() => setActive(group.key)}
              onBlur={() => setActive(null)}
              aria-label={`${t(`merchant.groups.${group.key}`)}: ${formatNumber(group.value)}`}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex-1">
                {t(`merchant.groups.${group.key}`)}
              </span>
              <strong>
                {formatNumber(group.value)}
              </strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
