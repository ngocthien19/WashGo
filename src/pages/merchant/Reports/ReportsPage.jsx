import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChartNoAxesCombined, Download, RefreshCw, CalendarDays } from 'lucide-react'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantReportApi } from '~/apis/merchant/merchantReportApi'
import { readReportQuery, vietnamToday, validReportRange, downloadReport } from './reportModel'
import ReportStats from './components/ReportStats'
import ReportFinance from './components/ReportFinance'
import ReportTopServices from './components/ReportTopServices'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import ReportCharts from './components/ReportCharts'

export default function ReportsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const today = vietnamToday()
  const range = useMemo(() => readReportQuery(params, today), [params, today])
  const [customDraft, setCustomDraft] = useState(null)
  const custom = range.mode === 'custom' || customDraft === params.toString()
  const [invalid, setInvalid] = useState(false)
  const load = useCallback((signal) => merchantReportApi.load(range, signal), [range])
  const resource = useCatalogResource(load)
  const [exporting, setExporting] = useState(false)
  const exportReport = async () => {
    if (exporting || !resource.data || resource.loading) {
      return
    }
    setExporting(true)
    try {
      downloadReport(await merchantReportApi.export(resource.data), resource.data)
      notify.success('merchant.reportSync.exported')
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setExporting(false)
    }
  }
  const shown = !resource.loading && !resource.error ? resource.data : null
  useEffect(() => {
    document.title = `${t('merchant.reports.title')} | WashGo`
  }, [t])
  const choosePeriod = (period) => {
    setInvalid(false)
    setCustomDraft(period === 'custom' ? params.toString() : null)
    if (period !== 'custom') {
      setParams({ period })
    }
  }
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <ChartNoAxesCombined className="text-primary" />
            {t('merchant.reports.title')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('merchant.reports.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => {
              setInvalid(false); resource.retry()
            }}
            disabled={resource.loading}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            className="h-11 px-4 text-base"
            disabled={!resource.data || resource.loading || !!resource.error || exporting}
            onClick={exportReport}
          >
            <Download size={17} />
            {t(exporting ? 'merchant.reportSync.exporting' : 'merchant.reports.export')}
          </Button>
        </div>
      </header>
      <section className="workspace-filters grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays
              size={19}
              className="text-primary"
            />
            {t('merchant.reports.period')}
          </p>
          <div
            role="group"
            aria-label={t('merchant.reports.period')}
            className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1"
          >
            {['day', 'week', 'month', 'custom'].map((period) => (
              <Button
                key={period}
                variant="ghost"
                aria-pressed={period === (custom ? 'custom' : range.mode)}
                onClick={() => choosePeriod(period)}
                className={`h-10 px-4 text-base font-semibold ${period === (custom ? 'custom' : range.mode) ? 'bg-primary/12 text-primary hover:bg-primary/15' : 'text-muted-foreground'}`}
              >
                {t(`merchant.reports.periods.${period}`)}
              </Button>
            ))}
          </div>
        </div>
        <ClearFiltersButton
          active={custom || range.mode !== 'month'}
          onClear={() => choosePeriod('month')}
        />
        {custom && (
          <DateRangeFilter
            key={`${shown?.current.fromLocalDate || '?'}-${shown?.current.toLocalDate || '?'}`}
            from={shown?.current.fromLocalDate || '?'}
            to={shown?.current.toLocalDate || '?'}
            label="merchant.reports.customRange"
            className="grid gap-3 border-t border-border pt-4 font-semibold [&_input]:font-semibold [&_label]:font-semibold [&_p]:font-semibold"
            onApply={({ from, to }) => {
              if (!from && !to) {
                choosePeriod('month'); return
              }
              if (!validReportRange(from, to, today)) {
                setInvalid(true); return
              }
              setInvalid(false); setParams({ period: 'custom', from, to })
            }}
          />
        )}
        {invalid && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {t('merchant.reports.invalidRange')}
          </p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="font-semibold">
              {t('merchant.reports.current')}
              :
              {' '}
            </strong>
            {shown?.current.fromLocalDate || '—'}
            {' '}
            →
            {shown?.current.toLocalDate || '—'}
          </p>
          <p>
            <strong className="font-semibold">
              {t('merchant.reports.previous')}
              :
              {' '}
            </strong>
            {shown?.previous.fromLocalDate || '—'}
            {' '}
            →
            {shown?.previous.toLocalDate || '—'}
          </p>
        </div>
      </section>
      {resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <>
          <ReportStats data={resource.data} />
          <ReportFinance data={resource.data} />
          <ReportCharts report={resource.data} />
          <ReportTopServices services={resource.data.topServices} />
        </>
      )}
    </Reveal>
  )
}
