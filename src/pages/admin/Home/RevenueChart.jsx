import { useTranslation } from 'react-i18next'
import { revenuePoints } from './revenueModel'
import { formatCurrency } from '~/utils/formats'

export default function RevenueChart({ data, range }) {
  const { t } = useTranslation()
  const rows = revenuePoints(data, range)
  const low = Math.min(0, ...rows.map((row) => row.revenue)), high = Math.max(1, ...rows.map((row) => row.revenue))
  const y = (value) => 170 - (value - low) / (high - low) * 150
  const points = rows.map((row, i) => ({ ...row, x: 12 + i / Math.max(1, rows.length - 1) * 576, y: y(row.revenue) }))
  const ticks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.max(1, Math.ceil(points.length / 4)) === 0)
  return (
    <div>
      <div className="rounded-xl border border-border bg-muted/15 p-3">
        <svg
          viewBox="0 0 600 190"
          className="h-56 w-full"
          role="img"
          aria-label={t('admin.revenueChart')}
        >
          {[20, 70, 120, 170].map((value) => (
            <line
              key={value}
              x1="12"
              x2="588"
              y1={value}
              y2={value}
              stroke="currentColor"
              className="text-border"
            />
          ))}
          <line
            x1="12"
            x2="588"
            y1={y(0)}
            y2={y(0)}
            stroke="currentColor"
            className="text-muted-foreground/40"
          />
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            className="text-primary"
          />
          {points.map((point) => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="currentColor"
              className="text-primary"
              tabIndex="0"
              aria-label={`${point.date}: ${formatCurrency(point.revenue)}`}
            >
              <title>
                {`${point.date}: ${formatCurrency(point.revenue)}`}
              </title>
            </circle>
          ))}
        </svg>
        <div className="relative h-4 text-[11px] text-muted-foreground">
          {ticks.map((point, i) => (
            <span
              key={point.date}
              className="absolute"
              style={{ left: `${point.x / 600 * 100}%`, transform: `translateX(${i === 0 ? '0' : i === ticks.length - 1 ? '-100%' : '-50%'})` }}
            >
              {point.date.slice(5).split('-').reverse().join('/')}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          {t('merchant.sync.viewRevenueData')}
        </summary>
        <div className="mt-3 max-h-60 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-2">
                  {t('merchant.sync.date')}
                </th>
                <th>
                  {t('admin.revenue')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.date}
                  className="border-t border-border"
                >
                  <td className="py-2">
                    {row.date}
                  </td>
                  <td>
                    {formatCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
