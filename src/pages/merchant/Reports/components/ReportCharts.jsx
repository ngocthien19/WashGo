import { useTranslation } from 'react-i18next'
import { BarChart3, TrendingUp } from 'lucide-react'
import MetricChart from '~/components/workspace/MetricChart'

function Chart({ title, Icon, points, series, line = false, hourly }) {
  const { t } = useTranslation()
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-4 text-lg font-bold">
        <Icon
          size={21}
          className="text-primary"
        />
        {t(title)}
      </h2>
      <MetricChart
        title={title}
        points={points}
        series={series}
        line={line}
        money={line}
        hourly={hourly}
      />
    </section>
  )
}
export default function ReportCharts({ report }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Chart
        title="merchant.reportSync.netChart"
        Icon={TrendingUp}
        points={report.series}
        hourly={report.granularity === 'hour'}
        series={[{ key: 'netRevenue', label: 'merchant.reports.current', color: 'var(--primary)' }, { key: 'previousNetRevenue', label: 'merchant.reports.previous', color: '#a78bfa' }]}
        line
      />
      <Chart
        title="merchant.reports.orderChart"
        Icon={BarChart3}
        points={report.series}
        hourly={report.granularity === 'hour'}
        series={[{ key: 'ordersCreated', label: 'merchant.reportSync.created', color: 'var(--primary)' }, { key: 'ordersCompleted', label: 'merchant.reportSync.completed', color: '#10b981' }]}
      />
    </div>
  )
}
