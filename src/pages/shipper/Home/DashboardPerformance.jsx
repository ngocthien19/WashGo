import { useTranslation } from 'react-i18next'
import { ChartColumn, Gauge } from 'lucide-react'
import MetricChart from '~/components/workspace/MetricChart'
import ShipperPanel from '../components/ShipperPanel'
import { formatDateTime, formatNumber } from '~/utils/formats'

export default function DashboardPerformance({ data, hourly }) {
  const { t } = useTranslation()
  const points = data.chart.map((row, index) => ({ ...row, index, computed: true, label: hourly ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(row.bucketStart)) : formatDateTime(row.bucketStart, 'Asia/Ho_Chi_Minh') }))
  const current = data.performance, previous = data.previousPerformance
  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[2fr_1fr]">
      <ShipperPanel
        title={t('shipper.sync.chart')}
        icon={ChartColumn}
      >
        <div className="p-5">
          <MetricChart
            title="shipper.sync.chart"
            points={points}
            hourly={hourly}
            series={[{ key: 'collectCount', label: 'shipper.deliveryHistory.collect', color: 'var(--primary)' }, { key: 'returnCount', label: 'shipper.deliveryHistory.return', color: '#8b5cf6' }]}
          />
        </div>
      </ShipperPanel>
      <ShipperPanel
        title={t('shipper.sync.performance')}
        icon={Gauge}
      >
        <dl className="space-y-4 p-5">
          {current && (
            <>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('shipper.sync.onTime')}
                </dt>
                <dd className="mt-2 text-2xl font-bold text-primary">
                  {current.onTimeRate == null ? '\u2014' : `${formatNumber(current.onTimeRate)}%`}
                </dd>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('shipper.sync.sample', { count: current.onTimeCount, total: current.slaSampleCount })}
                </p>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('shipper.sync.duration')}
                </dt>
                <dd className="mt-2 text-xl font-semibold">
                  {current.averageDurationHours == null ? '\u2014' : `${formatNumber(current.averageDurationHours)} h`}
                </dd>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('shipper.sync.durationSample', { count: current.durationSampleCount })}
                </p>
              </div>
            </>
          )}
          {previous && (
            <div className="border-t border-border pt-4">
              <dt className="text-sm text-muted-foreground">
                {t('shipper.sync.previous')}
              </dt>
              <dd className="mt-2 font-semibold">
                {formatNumber(previous.total)}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(data.previousFrom)}
                {' '}
                {'\u2013'}
                {' '}
                {formatDateTime(data.previousTo)}
              </p>
            </div>
          )}
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            {formatDateTime(data.from)}
            {' '}
            {'\u2013'}
            {' '}
            {formatDateTime(data.to)}
          </p>
        </dl>
      </ShipperPanel>
    </div>
  )
}
