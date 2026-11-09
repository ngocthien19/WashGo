import MetricChart from '~/components/workspace/MetricChart'
import { revenuePoints } from './revenueModel'

export default function RevenueChart({ data, range }) {
  const points = revenuePoints(data, range).map((row, index) => ({ ...row, index, computed: true, label: row.date.split('-').reverse().join('/') }))
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
