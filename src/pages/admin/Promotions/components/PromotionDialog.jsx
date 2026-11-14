import ClearFiltersButton from '~/components/ClearFiltersButton'
import DetailTabs from '~/components/DetailTabs'
import PromotionUsages from './PromotionUsages'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tags, Trash2, Power, Download, Ticket, Coins, Wallet, ShoppingBag, ClipboardCheck, ChartNoAxesCombined } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '~/components/ui/table'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import StatCard from '~/components/workspace/StatCard'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminPromotionApi } from '~/apis/admin/adminPromotionApi'
import { formatCurrency, formatNumber, formatDateTime } from '~/utils/format/formats'
import { dateRangeFilter } from '~/utils/format/dateRange'
import { notify } from '~/utils/notifications/notifications'
import { getApiError } from '~/utils/http/apiError'
import { snapshot, statusClass, unknownWrite, formatPromotionTime } from '../promotionModel'

function PromotionStatistics({ id }) {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState({ from: '', to: '' }), [exporting, setExporting] = useState(false)
  const params = useMemo(() => dateRangeFilter(range), [range])
  const load = useCallback(signal => adminPromotionApi.statistics(id, params, signal), [id, params])
  const resource = useCatalogResource(load), stats = resource.data
  const exportingLock = useRef(false)
  const download = async () => {
    if (exportingLock.current) {
      return
    }
    exportingLock.current = true; setExporting(true)
    try {
      const blob = await adminPromotionApi.export(id, params)
      const url = URL.createObjectURL(blob), anchor = document.createElement('a')
      anchor.href = url; anchor.download = `promotion-${id}-statistics.csv`; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify.success('admin.promotions.exported')
    } catch (failure) {
      notify.error(getApiError(failure))
    } finally {
      exportingLock.current = false; setExporting(false)
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="-mx-5 -mt-5 flex items-center gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 p-5 text-lg font-semibold">
        <ChartNoAxesCombined className="size-5 text-primary" />
        {t('admin.promotions.statistics')}
      </h2>
      <ClearFiltersButton
        active={range.from || range.to}
        onClear={() => setRange({ from: '', to: '' })}
      />
      <DateRangeFilter
        key={`${range.from}:${range.to}`}
        from={range.from}
        to={range.to}
        onApply={setRange}
        label="admin.promotions.usageRange"
        className="workspace-filters space-y-3 rounded-xl bg-muted/30 p-4"
      />
      {!stats ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <>
          {stats.fromDate && stats.toDate && (
            <p className="text-sm text-muted-foreground">
              {formatDateTime(stats.fromDate, 'Asia/Ho_Chi_Minh')}
              {' '}
              –
              {' '}
              {formatDateTime(stats.toDate, 'Asia/Ho_Chi_Minh')}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[['usedCount', Ticket], ['totalDiscountAmount', Coins], ['revenue', ShoppingBag], ['paidRevenue', Wallet]].map(([key, Icon], index) => (
              <StatCard
                key={key}
                label={t(`admin.promotions.stats.${key}`)}
                value={key === 'usedCount' ? stats[key] : formatCurrency(stats[key])}
                icon={Icon}
                className={['border-l-primary', 'border-l-amber-500', 'border-l-violet-500', 'border-l-emerald-500'][index]}
                iconClassName={['bg-primary/10 text-primary', 'bg-amber-500/10 text-amber-700 dark:text-amber-300', 'bg-violet-500/10 text-violet-700 dark:text-violet-300', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'][index]}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('admin.promotions.revenueHint')}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {t('admin.promotions.orderValue', { value: formatCurrency(stats.totalOrderAmount) })}
            </p>
            <Button
              onClick={download}
              disabled={exporting || resource.loading}
              variant="outline"
              className="h-11 border-emerald-200 bg-emerald-50 px-5 text-base text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-200"
            >
              <Download size={18} />
              {t(exporting ? 'admin.promotions.exporting' : 'admin.promotions.export')}
            </Button>
          </div>
          {stats.daily.length ? (
            <Table
              aria-label={t('admin.promotions.daily')}
              className="min-w-[580px]"
            >
              <TableHeader>
                <TableRow>
                  {['date', 'usedCount', 'discountAmount', 'revenue'].map(key => (
                    <TableHead
                      key={key}
                      className="bg-primary/5"
                    >
                      {t(`admin.promotions.dailyColumns.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.daily.map(day => (
                  <TableRow key={day.date}>
                    <TableCell>
                      {new Intl.DateTimeFormat(i18n.resolvedLanguage === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${day.date}T00:00:00+07:00`))}
                    </TableCell>
                    <TableCell>
                      {formatNumber(day.usedCount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(day.discountAmount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(day.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-center text-muted-foreground">
              {t('admin.promotions.noUsage')}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default function PromotionDialog({ id, kind, onClose, onSaved }) {
  const { t } = useTranslation()
  const detail = kind === 'detail'
  const [tab, setTab] = useState('conditions')
  const load = useCallback(signal => adminPromotionApi.detail(id, signal), [id])
  const resource = useCatalogResource(load), value = resource.data
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [confirmed, setConfirmed] = useState(false), [error, setError] = useState('')
  const locked = useRef(false)
  const run = async () => {
    if (!value || locked.current || blocked || !confirmed || kind === 'delete' && (value.canDelete === false || value.usedCount > 0)) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const latest = await load()
      if (snapshot(latest) !== snapshot(value)) {
        setBlocked(true); throw new Error('admin.promotions.changed')
      }
      writing = true
      if (kind === 'delete') {
        await adminPromotionApi.remove(id, latest.version)
      } else {
        await adminPromotionApi.toggle(latest)
      }
      notify.success(kind === 'delete' ? 'admin.promotions.deleted' : 'admin.promotions.statusUpdated'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.promotions.unknown' : getApiError(failure); setError(message); notify.error(message)
    } finally {
      locked.current = false; setPending(false)
    }
  }
  const title = detail ? 'detail' : kind === 'delete' ? 'delete' : value?.isActive ? 'deactivate' : 'activate'
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !locked.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        ready={!resource.loading}
        className={detail ? 'max-w-5xl' : 'max-w-xl'}
        closeLabel="common.close"
      >
        <DialogHeader tone={kind === 'delete' ? 'danger' : detail ? 'info' : value?.isActive ? 'warning' : 'success'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            {kind === 'delete' ? <Trash2 className="text-destructive" /> : detail ? <Tags className="text-primary" /> : <Power className="text-primary" />}
            {t(`admin.promotions.${title}`)}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t(detail ? 'admin.promotions.detailHint' : kind === 'delete' ? 'admin.promotions.deleteHint' : 'admin.promotions.statusHint')}
          </DialogDescription>
        </DialogHeader>
        {!value ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
              <div>
                <p className="text-xl font-semibold text-primary">
                  {value.code}
                </p>
                <p className="mt-2 max-w-xl whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {value.description || '—'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(value.status)}`}>
                {t(`admin.promotions.statuses.${value.status}`)}
              </span>
            </div>
            {detail ? (
              <DetailTabs
                label={t('admin.promotions.detail')}
                tabs={[{ value: 'conditions', label: t('admin.promotions.conditions') }, { value: 'statistics', label: t('admin.promotions.statistics') }, { value: 'usages', label: t('admin.sync.promotionUsages') }]}
                value={tab}
                onChange={setTab}
              >
                {tab === 'conditions' && (
                  <section className="rounded-2xl border border-border p-5">
                    <h2 className="-mx-5 -mt-5 mb-5 flex items-center gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 p-5 text-lg font-semibold">
                      <ClipboardCheck className="size-5 text-primary" />
                      {t('admin.promotions.conditions')}
                    </h2>
                    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ['discountType', t(`admin.promotions.types.${value.discountType}`)], ['discountValue', value.discountType === 1 ? `${formatNumber(value.discountValue)}%` : formatCurrency(value.discountValue)], ['minOrderAmount', formatCurrency(value.minOrderAmount)], ['maxDiscountAmount', value.maxDiscountAmount == null ? t('admin.promotions.unlimited') : formatCurrency(value.maxDiscountAmount)], ['startAt', formatPromotionTime(value.startAt)], ['endAt', formatPromotionTime(value.endAt)], ['usageLimit', value.usageLimit ?? t('admin.promotions.unlimited')], ['usageLimitPerCustomer', value.usageLimitPerCustomer ?? t('admin.promotions.unlimited')], ['usedCount', formatNumber(value.usedCount)]
                      ].map(([key, text]) => (
                        <div key={key}>
                          <dt className="text-base text-muted-foreground">
                            {t(`admin.promotions.fields.${key}`)}
                          </dt>
                          <dd className="mt-2 text-base font-semibold">
                            {text}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
                {tab === 'statistics' && <PromotionStatistics id={id} />}
                {tab === 'usages' && <PromotionUsages id={id} />}
              </DetailTabs>
            ) : (
              <>
                {kind === 'delete' && (value.canDelete === false || value.usedCount > 0) && (
                  <p className="text-sm text-destructive">
                    {t('admin.promotions.usedRule')}
                  </p>
                )}
                <label className="flex items-center gap-3 text-base">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={setConfirmed}
                    disabled={pending || blocked || kind === 'delete' && (value.canDelete === false || value.usedCount > 0)}
                  />
                  {t('admin.promotions.confirmHint')}
                </label>
              </>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {t(error)}
              </p>
            )}
          </div>
        )}
        <footer className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="h-11 px-5 text-base"
          >
            {t('common.close')}
          </Button>
          {!detail && (
            <Button
              onClick={run}
              disabled={!value || pending || blocked || !confirmed || kind === 'delete' && value?.usedCount > 0}
              variant={kind === 'delete' ? 'destructive' : 'default'}
              className="h-11 px-5 text-base"
            >
              {t('admin.promotions.confirm')}
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  )
}
