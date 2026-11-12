import MetricChart from '~/components/workspace/MetricChart'
import { revenuePoints } from './revenueModel'

export default function RevenueChart({ data, range, hourly }) {
  const points = (Array.isArray(hourly) && range.from === range.to ? hourly.map(row => ({ date: row.hourStart, revenue: row.revenue, hour: true })) : revenuePoints(data, range)).map((row, index) => ({ ...row, index, computed: true, label: row.hour ? row.date.slice(11, 16) : row.date.split('-').reverse().join('/') }))
  return (
    <MetricChart
      title="admin.revenueChart"
      points={points}
      series={[{ key: 'revenue', label: 'admin.finance.kpis.totalRevenue', color: 'var(--primary)' }]}
      money
      line
      viewData="merchant.sync.viewRevenueData"
    />
  )
}
