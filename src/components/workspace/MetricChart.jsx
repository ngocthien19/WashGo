import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/format/formats'
import { chartScale, chartTickLabels } from './chartModel'

// Plot, hit areas and X labels share the same width; no SVG letterboxing offset.
export default function MetricChart({ title, points, series, money = false, line = false, hourly = false, viewData = 'merchant.reports.viewData' }) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState(null)
  const gradientId = useId().replaceAll(':', '')
  const known = points.filter(point => point.computed !== false)
  const scale = chartScale(known.flatMap(point => series.map(s => point[s.key])), !money)
  const y = value => (scale.max - value) / (scale.max - scale.min) * 224
  const selected = points.find((_, index) => index === active)
  const format = money ? formatCurrency : formatNumber
  const labels = chartTickLabels(points, hourly)
  const label = point => `${point.label}: ${point.computed !== false ? series.map(s => `${t(s.label)} ${format(point[s.key])}`).join(', ') : t('merchant.reportSync.notComputed')}`
  const width = Math.max(320, points.length * (line ? 20 : 38))
  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {series.map(s => (
          <span
            key={s.key}
            className="flex items-center gap-2"
          >
            <i
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {t(s.label)}
          </span>
        ))}
      </div>
      <div
        role="group"
        aria-label={t(title)}
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-border/60 bg-muted/10 p-4"
      >
        <div style={{ minWidth: width }}>
          <div className="relative ml-16 h-56">
            {scale.ticks.map(tick => (
              <div
                key={tick}
                className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                style={{ top: y(tick) }}
              >
                <span className="absolute -left-16 -top-2 w-14 text-right text-xs tabular-nums text-muted-foreground">
                  {new Intl.NumberFormat(i18n.resolvedLanguage, { notation: money ? 'compact' : 'standard', maximumFractionDigits: money ? 1 : 0 }).format(tick)}
                </span>
              </div>
            ))}
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-muted-foreground/40"
              style={{ top: y(0) }}
            />
            {line && (
              <svg
                aria-hidden="true"
                viewBox="0 0 1000 224"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity="0.16"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity="0.01"
                    />
                  </linearGradient>
                </defs>
                {series.map((s, seriesIndex) => {
                  const segments = []
                  points.forEach((point, index) => {
                    if (point.computed === false) {
                      return
                    }
                    if (index === 0 || points[index - 1].computed === false) {
                      segments.push([])
                    }
                    segments.at(-1).push(`${(index + 0.5) / points.length * 1000},${y(point[s.key])}`)
                  })
                  return segments.map((segment, index) => (
                    <g key={`${s.key}:${index}`}>
                      {seriesIndex === 0 && segment.length > 1 && (
                        <path
                          d={`M${segment[0].split(',')[0]},${y(0)} L${segment.join(' L')} L${segment.at(-1).split(',')[0]},${y(0)} Z`}
                          fill={`url(#${gradientId})`}
                        />
                      )}
                      <path
                        d={`M${segment.join(' L')}`}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinejoin="round"
                        strokeDasharray={seriesIndex ? '5 4' : undefined}
                      />
                    </g>
                  ))
                })}
              </svg>
            )}
            <div className="absolute inset-0 flex">
              {points.map((point, index) => (
                <button
                  key={point.index ?? index}
                  type="button"
                  aria-label={label(point)}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(index)}
                  className="relative min-w-0 flex-1 outline-none hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  {point.computed !== false && series.map((s, column) => line ? (
                    <span
                      key={s.key}
                      className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
                      style={{ left: '50%', top: y(point[s.key]), backgroundColor: s.color }}
                    />
                  ) : (
                    <span
                      key={s.key}
                      className="absolute rounded-t-md"
                      style={{ width: `${64 / series.length}%`, left: `${18 + column * 64 / series.length}%`, top: Math.min(y(0), y(point[s.key])), height: Math.abs(y(0) - y(point[s.key])), backgroundColor: s.color }}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
          <div
            className="ml-16 mt-3 flex text-center text-xs tabular-nums text-muted-foreground"
            data-chart-axis="x"
          >
            {labels.map((text, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 whitespace-nowrap"
              >
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-live="polite"
        className="my-4 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-muted/25 px-3 py-2 text-sm text-muted-foreground"
      >
        {selected ? (
          <>
            <span>
              {selected.label}
              :
            </span>
            {selected.computed === false ? t('merchant.reportSync.notComputed') : series.map(s => (
              <span
                key={s.key}
                className="inline-flex items-center gap-2"
              >
                {t(s.label)}
                <strong className="font-bold tabular-nums text-foreground">
                  {format(selected[s.key])}
                </strong>
              </span>
            ))}
          </>
        ) : t('merchant.reports.chartHint')}
      </div>
      <details className="rounded-xl bg-muted/25 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          {t(viewData)}
        </summary>
        <div className="mt-3 max-h-72 overflow-auto">
          <table className="w-full text-left">
            <caption className="sr-only">
              {t(title)}
            </caption>
            <thead>
              <tr>
                <th className="p-2">
                  {t('merchant.reports.buckets')}
                </th>
                {series.map(s => (
                  <th
                    key={s.key}
                    className="p-2"
                  >
                    {t(s.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr
                  key={point.index ?? index}
                  className="border-t border-border"
                >
                  <th
                    scope="row"
                    className="p-2 font-medium"
                  >
                    {point.label}
                  </th>
                  {series.map(s => (
                    <td
                      key={s.key}
                      className="whitespace-nowrap p-2 font-medium"
                    >
                      {point.computed !== false ? format(point[s.key]) : t('merchant.reportSync.notComputed')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
