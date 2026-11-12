import ReviewComment from './components/ReviewComment'
import ReviewContact from './components/ReviewContact'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, RefreshCw, Eye, EyeOff, Layers, ListChecks, X, MessageSquareText, MoreHorizontal } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import StatCard from '~/components/workspace/StatCard'
import TablePagination from '~/components/Pagination/TablePagination'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { adminReviewApi } from '~/apis/admin/adminReviewApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { ADMIN_ROUTES } from '~/utils/constants'
import { formatDateTime, formatNumber } from '~/utils/formats'
import { readReviewQuery, writeReviewQuery, reviewFilter, REVIEW_TAKE, canModerate } from './reviewModel'
import { ReviewScore, ReviewStatus } from './components/ReviewDisplay'
import ReviewDetail from './components/ReviewDetail'
import ReviewActionDialog from './components/ReviewActionDialog'

export default function ReviewsPage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${t('admin.nav.reviews')} | WashGo`
  }, [t])
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readReviewQuery(params), [params])
  const [revision, setRevision] = useState(0), [resetVersion, setResetVersion] = useState(0)
  const [selection, setSelection] = useState({ source: null, ids: [] }), [detail, setDetail] = useState(null), [action, setAction] = useState(null), [unresolved, setUnresolved] = useState(null)
  const resource = useCatalogResource(useCallback(signal => adminReviewApi.list(reviewFilter(query), signal), [query]), revision)
  const { keyword, merchantId, stars, isHidden, from, to } = query
  const summaryQuery = useMemo(() => reviewFilter({ keyword, merchantId, stars, isHidden, from, to, page: 1 }), [keyword, merchantId, stars, isHidden, from, to])
  const summary = useCatalogResource(useCallback(signal => adminReviewApi.summary(summaryQuery, signal), [summaryQuery]), revision)
  const merchants = useCatalogResource(adminReviewApi.merchants)
  const update = patch => setParams(writeReviewQuery({ ...query, ...patch, page: patch.page || 1 }))
  const rows = resource.data?.list || []
  const ids = selection.source === resource.data && !resource.loading && !resource.error ? selection.ids : []
  const selected = rows.filter(row => ids.includes(row.id))
  const locked = id => unresolved?.rows.some(row => row.id === id)
  const active = Object.entries(query).some(([key, value]) => key !== 'page' && value !== '')
  const saved = () => {
    setSelection({ source: null, ids: [] }); setRevision(value => value + 1)
  }
  return (
    <Reveal className="mx-auto max-w-[1800px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Star className="size-8 text-primary" />
            {t('admin.nav.reviews')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('admin.reviews.description')}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-5 text-base"
          disabled={resource.loading || summary.loading}
          onClick={() => {
            setSelection({ source: null, ids: [] }); setRevision(value => value + 1)
          }}
        >
          <RefreshCw className="size-4" />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['total', ListChecks], ['visible', Eye], ['hidden', EyeOff], ['averageStars', Star]].map(([key, Icon]) => (
          <StatCard
            key={key}
            label={t(`admin.reviews.${key === 'total' ? 'total' : key === 'averageStars' ? 'average' : key}`)}
            value={summary.loading || summary.error || summary.data?.unavailable || summary.data?.[key] == null ? '—' : key === 'averageStars' ? `${formatNumber(summary.data[key])} / 5` : formatNumber(summary.data[key])}
            icon={Icon}
            className={key === 'hidden' ? 'border-l-rose-500' : key === 'averageStars' ? 'border-l-amber-500' : 'border-l-primary'}
            iconClassName={key === 'hidden' ? 'bg-rose-500/10 text-rose-600' : key === 'averageStars' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}
          />
        ))}
      </div>
      {summary.data?.histogram && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Star className="size-5 text-amber-500" />
            {t('admin.reviews.distribution')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-5">
            {[5, 4, 3, 2, 1].map(stars => (
              <div
                key={stars}
                className="rounded-xl bg-muted/30 p-3"
              >
                <span className="font-medium">
                  {stars}
                  {' '}
                  / 5
                </span>
                <strong className="float-right">
                  {formatNumber(summary.data.histogram[String(stars)] || 0)}
                </strong>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${summary.data.total ? (summary.data.histogram[String(stars)] || 0) / summary.data.total * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {summary.data?.unavailable && (
        <p className="text-sm text-muted-foreground">
          {t('admin.reviews.summaryPending')}
        </p>
      )}
      {summary.error && <ResourceFeedback {...summary} />}
      {unresolved && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"
        >
          <p className="text-sm">
            {t('admin.reviews.unknown')}
          </p>
          <Button
            variant="outline"
            onClick={() => setAction(unresolved)}
          >
            {t('admin.sync.checkResult')}
          </Button>
        </div>
      )}
      <section className="workspace-filters space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium">
              {t('admin.reviews.search')}
            </p>
            <CatalogToolbar
              resetKey={resetVersion}
              embedded
              keyword={query.keyword}
              onSearch={keyword => update({ keyword })}
              label={t('admin.reviews.search')}
              placeholder={t('admin.reviews.searchHint')}
            />
          </div>
          <label className="grid gap-2 text-sm font-medium">
            {t('admin.reviews.merchantName')}
            <SelectField
              label={t('admin.reviews.merchantName')}
              value={query.merchantId}
              onValueChange={merchantId => update({ merchantId })}
              disabled={merchants.loading || !!merchants.error}
              options={[{ value: '', label: t('common.all') }, ...(merchants.data || []).map(row => ({ value: row.id, label: row.name })), ...(query.merchantId && !merchants.data?.some(row => row.id === query.merchantId) ? [{ value: query.merchantId, label: t('admin.reviews.selectedMerchant') }] : [])]}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('admin.reviews.stars')}
            <SelectField
              label={t('admin.reviews.stars')}
              value={query.stars}
              onValueChange={stars => update({ stars })}
              options={[{ value: '', label: t('common.all') }, ...[5, 4, 3, 2, 1].map(value => ({ value: String(value), label: `${value} / 5` }))]}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('admin.reviews.status')}
            <SelectField
              label={t('admin.reviews.status')}
              value={query.isHidden}
              onValueChange={isHidden => update({ isHidden })}
              options={[{ value: '', label: t('common.all') }, { value: 'false', label: t('admin.reviews.visible') }, { value: 'true', label: t('admin.reviews.hidden') }]}
            />
          </label>
        </div>
        {merchants.error && <ResourceFeedback {...merchants} />}
        <DateRangeFilter
          key={`${resetVersion}:${query.from}:${query.to}`}
          from={query.from}
          to={query.to}
          onApply={update}
          label="admin.reviews.dateRange"
          className="space-y-3 border-t border-border pt-4"
        />
        <ClearFiltersButton
          active={active}
          onClear={() => {
            setResetVersion(value => value + 1); setParams({})
          }}
        />
      </section>
      {selected.length > 0 && (
        <div
          role="region"
          aria-label={t('admin.reviews.bulk')}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
        >
          <p className="font-semibold text-primary">
            {t('admin.reviews.selected', { count: selected.length })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-12 px-6 text-base"
              disabled={!!unresolved}
              onClick={() => setAction({ rows: selected, bulk: true })}
            >
              <Layers className="size-5" />
              {t('admin.reviews.bulk')}
            </Button>
            <Button
              variant="ghost"
              aria-label={t('admin.reviews.clearSelection')}
              onClick={() => setSelection({ source: null, ids: [] })}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-busy={resource.loading}
      >
        <p className="border-b border-border p-5 text-base">
          <strong className="mr-2 text-2xl">
            {resource.loading || resource.error ? '—' : formatNumber(resource.data?.total)}
          </strong>
          {t('admin.reviews.results')}
        </p>
        {resource.loading || resource.error ? (
          <ResourceFeedback
            {...resource}
            loadingText="admin.loading"
          />
        ) : (
          <>
            <Table
              className="min-w-[1840px] text-base"
              aria-label={t('admin.nav.reviews')}
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">
                    <Checkbox
                      aria-label={t('admin.reviews.selectPage')}
                      checked={rows.length > 0 && ids.length === rows.filter(row => !locked(row.id)).length && ids.length > 0}
                      indeterminate={ids.length > 0 && ids.length < rows.filter(row => !locked(row.id)).length}
                      disabled={!rows.length || rows.every(row => locked(row.id))}
                      onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? rows.filter(row => !locked(row.id)).map(row => row.id) : [] })}
                    />
                  </TableHead>
                  {['order', 'customerName', 'merchantName', 'stars', 'comment', 'status', 'created', 'actions'].map(key => (
                    <TableHead
                      key={key}
                      className={key === 'actions' ? 'sticky right-0 z-20 w-28 min-w-28 border-l border-border bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] text-center shadow-[-1px_0_0_var(--border)] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))]' : key === 'comment' ? 'w-80 min-w-80' : key === 'created' ? 'min-w-52' : ''}
                    >
                      {t(`admin.reviews.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length ? rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={t('admin.reviews.selectNamed', { code: row.orderCode })}
                        checked={ids.includes(row.id)}
                        disabled={!!locked(row.id)}
                        onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? [...ids, row.id] : ids.filter(id => id !== row.id) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        className="whitespace-nowrap font-semibold text-primary hover:underline"
                        to={`${ADMIN_ROUTES.ORDERS}/${row.orderId}`}
                      >
                        {row.orderCode}
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-64">
                      <ReviewContact row={row} />
                    </TableCell>
                    <TableCell className="min-w-64">
                      <ReviewContact
                        row={row}
                        merchant
                      />
                    </TableCell>
                    <TableCell>
                      <ReviewScore value={row.overallStars} />
                    </TableCell>
                    <TableCell className="w-80 min-w-80 max-w-80">
                      <ReviewComment>
                        {row.comment || t('admin.reviews.noComment')}
                      </ReviewComment>
                      {!!(row.imageUrls?.length || row.videoUrls?.length) && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t('admin.reviews.mediaCount', { images: row.imageUrls?.length || 0, videos: row.videoUrls?.length || 0 })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <ReviewStatus hidden={row.isHidden} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(row.createdOn)}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 w-28 min-w-28 border-l border-border bg-card text-center shadow-[-1px_0_0_var(--border)] dark:bg-card">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            variant="secondary"
                            size="icon"
                            className="size-11"
                            aria-label={t('admin.reviews.actionsNamed', { code: row.orderCode })}
                          />
                        )}
                        >
                          <MoreHorizontal className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="min-w-56"
                        >
                          <DropdownMenuItem
                            className="min-h-11 text-base"
                            onClick={() => setDetail(row)}
                          >
                            <Eye className="size-5 text-primary" />
                            {t('admin.reviews.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="min-h-11 text-base text-destructive"
                            disabled={!!unresolved || !canModerate(row, true)}
                            onClick={() => setAction({ rows: [row] })}
                          >
                            <EyeOff className="size-5" />
                            {t('admin.reviews.hide')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="min-h-11 text-base text-emerald-700 dark:text-emerald-300"
                            disabled={!!unresolved || !canModerate(row, false)}
                            onClick={() => setAction({ rows: [row] })}
                          >
                            <Eye className="size-5" />
                            {t('admin.reviews.show')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="grid min-h-40 place-items-center gap-3 p-8 text-muted-foreground">
                        <MessageSquareText className="size-8" />
                        <p>
                          {t('admin.reviews.empty')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {!!resource.data?.total && (
              <TablePagination
                currentPage={query.page}
                totalPages={resource.data.totalPages}
                total={resource.data.total}
                pageSize={REVIEW_TAKE}
                rowCount={rows.length}
                onPageChange={page => update({ page })}
              />
            )}
          </>
        )}
      </section>
      {detail && (
        <ReviewDetail
          selected={detail}
          blocked={!!unresolved}
          onClose={() => setDetail(null)}
          onAction={row => {
            setDetail(null); setAction({ rows: [row] })
          }}
        />
      )}
      {action && (
        <ReviewActionDialog
          {...action}
          onClose={() => setAction(null)}
          onSaved={saved}
          onUnknown={setUnresolved}
          onResolved={() => setUnresolved(null)}
        />
      )}
    </Reveal>
  )
}
