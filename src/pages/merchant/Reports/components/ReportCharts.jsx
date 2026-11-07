import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, TrendingUp, DatabaseZap } from 'lucide-react'
import { formatNumber } from '~/utils/formats'

export function ReportPending({ message, icon: Icon = DatabaseZap }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-64 content-center justify-items-center gap-3 p-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/8 text-primary">
        <Icon size={26} />
      </span>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground">
        {t(message)}
      </p>
    </div>
  )
}

export default function ReportCharts({ buckets }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(null)
  const max = Math.ceil(Math.max(1, ...buckets.flatMap((bucket) => [bucket.current, bucket.previous])) / 4) * 4
  const width = 640, height = 270, left = 48, bottom = 35, top = 15, plotHeight = height - bottom - top
  const step = (width - left - 15) / buckets.length
  const selected = buckets.find((bucket) => bucket.key === active)
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-border p-5 text-lg font-bold">
          <TrendingUp
            className="text-primary"
            size={21}
          />
          {t('merchant.reports.revenueChart')}
        </h2>
        <ReportPending
          message="merchant.reports.revenuePending"
          icon={TrendingUp}
        />
      </section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BarChart3
            className="text-primary"
            size={21}
          />
          {t('merchant.reports.orderChart')}
        </h2>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {['current', 'previous'].map((key) => (
            <span
              key={key}
              className="flex items-center gap-2"
            >
              <i className={`size-2.5 rounded-full ${key === 'current' ? 'bg-primary' : 'bg-violet-400'}`} />
              {t(`merchant.reports.${key}`)}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t('merchant.reports.orderChart')}
            className="mt-5 min-w-[480px] w-full text-muted-foreground"
          >
            {[0, 1, 2, 3, 4].map((index) => {
              const y = top + index * plotHeight / 4
              return (
                <g key={index}>
                  <line
                    x1={left}
                    x2={width - 15}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    opacity="0.12"
                  />
                  <text
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                  >
                    {formatNumber(Math.ceil(max * (4 - index) / 4))}
                  </text>
                </g>
              )
            })}
            {buckets.map((bucket, index) => (
              <g
                key={bucket.key}
                tabIndex={0}
                role="button"
                aria-label={`${bucket.label}: ${t('merchant.reports.current')} ${bucket.current}, ${t('merchant.reports.previous')} ${bucket.previous}`}
                className="cursor-pointer outline-none focus:text-primary"
                onMouseEnter={() => setActive(bucket.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(bucket.key)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(bucket.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); setActive(bucket.key)
                  }
                }}
              >
                <rect
                  x={left + index * step + 2}
                  y={top}
                  width={Math.max(1, step - 4)}
                  height={plotHeight}
                  fill="currentColor"
                  opacity={active === bucket.key ? 0.07 : 0}
                />
                {['previous', 'current'].map((key, column) => {
                  const barHeight = bucket[key] / max * plotHeight
                  return (
                    <rect
                      key={key}
                      x={left + index * step + step * (0.15 + column * 0.36)}
                      y={height - bottom - barHeight}
                      width={step * 0.3}
                      height={barHeight}
                      rx="3"
                      fill={key === 'current' ? 'var(--primary)' : '#a78bfa'}
                      opacity={key === 'current' ? 1 : 0.65}
                    />
                  )
                })}
                {(buckets.length <= 7 || index % 2 === 0 || index === buckets.length - 1) && (
                  <text
                    x={left + (index + 0.5) * step}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                  >
                    {bucket.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
        <p
          className="min-h-6 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {selected ? `${selected.label} · ${t('merchant.reports.current')}: ${formatNumber(selected.current)} · ${t('merchant.reports.previous')}: ${formatNumber(selected.previous)}` : t('merchant.reports.chartHint')}
        </p>
        <details className="mt-3 rounded-xl bg-muted/30 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">
            {t('merchant.reports.viewData')}
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">
                {t('merchant.reports.orderChart')}
              </caption>
              <thead>
                <tr>
                  {['buckets', 'current', 'previous'].map((key) => (
                    <th
                      key={key}
                      className="p-2"
                    >
                      {t(`merchant.reports.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buckets.map((bucket) => (
                  <tr
                    key={bucket.key}
                    className="border-t border-border"
                  >
                    <th
                      scope="row"
                      className="p-2 font-medium"
                    >
                      {bucket.label}
                    </th>
                    <td className="p-2">
                      {formatNumber(bucket.current)}
                    </td>
                    <td className="p-2">
                      {formatNumber(bucket.previous)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  )
}
