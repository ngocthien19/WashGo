import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tags, Plus, RefreshCw, MoreHorizontal, Eye, Pencil, Power, Trash2, CalendarClock, Clock, CircleCheck, Layers, X } from 'lucide-react'
import { Checkbox } from '~/components/ui/checkbox'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import StatCard from '~/components/workspace/StatCard'
import TablePagination from '~/components/Pagination/TablePagination'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Reveal from '~/components/motion/Reveal'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminPromotionApi } from '~/apis/admin/adminPromotionApi'
import { formatCurrency, formatNumber } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { readQuery, writeQuery, filter, statusClass, TAKE, formatPromotionTime } from './promotionModel'
import PromotionEditor from './components/PromotionEditor'
import PromotionDialog from './components/PromotionDialog'
import PromotionBulkDialog from './components/PromotionBulkDialog'

const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
export default function PromotionsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams(), [modal, setModal] = useState(null), [opening, setOpening] = useState(false)
  const query = useMemo(() => readQuery(params), [params])
  const load = useCallback(signal => adminPromotionApi.list(filter(query), signal), [query])
  const resource = useCatalogResource(load), summary = useCatalogResource(adminPromotionApi.summary)
  const [selection, setSelection] = useState({ source: null, ids: [] })
  const rows = resource.data?.list || []
  const ids = selection.source === resource.data && !resource.loading ? selection.ids : []
  const selected = rows.filter(row => ids.includes(row.id))
  const linked = isId(params.get('promotion')) ? { kind: 'detail', id: params.get('promotion') } : null
  const current = modal || linked
  const [resetVersion, setResetVersion] = useState(0)
  const update = patch => setParams(writeQuery({ ...query, ...patch, page: patch.page || 1 }))
  const close = () => {
    setModal(null); if (linked) {
      const next = new URLSearchParams(params); next.delete('promotion'); setParams(next, { replace: true })
    }
  }
  const refresh = () => {
    resource.retry(); summary.retry()
  }
  const saved = () => {
    close(); refresh()
  }
  const edit = async id => {
    if (opening) {
      return
    }
    setOpening(true)
    try {
      setModal({ kind: 'edit', value: await adminPromotionApi.detail(id) })
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setOpening(false)
    }
  }
  useEffect(() => {
    document.title = `${t('admin.nav.promotions')} | WashGo`
  }, [t])
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Tags className="text-primary" />
            {t('admin.nav.promotions')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('admin.promotions.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={resource.loading || summary.loading}
            onClick={refresh}
            className="h-11 px-5 text-base"
          >
            <RefreshCw size={18} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            onClick={() => setModal({ kind: 'create' })}
            className="h-11 px-5 text-base"
          >
            <Plus size={18} />
            {t('admin.promotions.create')}
          </Button>
        </div>
      </header>
      {!summary.data ? (
        <ResourceFeedback
          {...summary}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[['total', Tags], ['active', CircleCheck], ['upcoming', CalendarClock], ['expired', Clock]].map(([key, Icon], index) => (
            <StatCard
              key={key}
              icon={Icon}
              label={t(`admin.promotions.summary.${key}`)}
              value={summary.data[index]}
              className={['border-l-primary', 'border-l-emerald-500', 'border-l-blue-500', 'border-l-red-500'][index]}
              iconClassName={['bg-primary/10 text-primary', 'bg-emerald-500/10 text-emerald-600', 'bg-blue-500/10 text-blue-600', 'bg-red-500/10 text-red-600'][index]}
            />
          ))}
        </div>
      )}
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-2">
          <p className="text-sm">
            {t('admin.promotions.search')}
          </p>
          <CatalogToolbar
            resetKey={resetVersion}
            embedded
            label={t('admin.promotions.search')}
            placeholder={t('admin.promotions.searchHint')}
            keyword={query.keyword}
            onSearch={keyword => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        {[['status', [0, 1, 2, 3, 4], 'statuses'], ['type', [1, 2], 'types']].map(([key, values, labels]) => (
          <label
            key={key}
            className="grid gap-2 text-sm"
          >
            <span>
              {t(`admin.promotions.${key}`)}
            </span>
            <SelectField
              label={t(`admin.promotions.${key}`)}
              value={query[key]}
              onValueChange={value => update({ [key]: value })}
              options={[{ value: '', label: t('common.all') }, ...values.map(value => ({ value: String(value), label: t(`admin.promotions.${labels}.${value}`) }))]}
            />
          </label>
        ))}
        <ClearFiltersButton
          className="sm:col-span-2 xl:col-span-full"
          active={query.keyword || query.status || query.type || query.from || query.to}
          onClear={() => {
            setResetVersion(value => value + 1); setParams({})
          }}
        />
        <DateRangeFilter
          key={`${resetVersion}:${query.from}:${query.to}`}
          from={query.from}
          to={query.to}
          onApply={range => update(range)}
          label="admin.promotions.effectiveRange"
        />
      </section>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-semibold text-primary">
            {t('admin.promotions.bulk.selected', { count: selected.length })}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setModal({ kind: 'bulk', promotions: selected })}
              className="h-11 px-5 text-base"
            >
              <Layers size={18} />
              {t('admin.promotions.bulk.title')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('admin.promotions.bulk.clear')}
              onClick={() => setSelection({ source: null, ids: [] })}
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      )}
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-busy={resource.loading}
      >
        <p className="border-b border-border p-5">
          <strong className="mr-2 text-2xl">
            {resource.loading || resource.error ? '—' : formatNumber(resource.data?.total)}
          </strong>
          {t('admin.promotions.results')}
        </p>
        {resource.loading || resource.error || !resource.data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
            empty="admin.promotions.empty"
          />
        ) : (
          <>
            <Table
              className="min-w-[1250px] text-base"
              aria-label={t('admin.nav.promotions')}
            >
              <TableHeader>
                <TableRow>
                  <TableHead className={`${headerBg} w-14`}>
                    <Checkbox
                      aria-label={t('admin.promotions.bulk.selectPage')}
                      checked={rows.length > 0 && ids.length === rows.length}
                      indeterminate={ids.length > 0 && ids.length < rows.length}
                      onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? rows.map(row => row.id) : [] })}
                    />
                  </TableHead>
                  {['code', 'discount', 'conditions', 'effective', 'usage', 'status', 'actions'].map(key => (
                    <TableHead
                      key={key}
                      className={`${headerBg} ${key === 'actions' ? 'sticky right-0 z-20 w-24 border-l border-border text-center' : ''}`}
                    >
                      {t(`admin.promotions.columns.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resource.data.list.map(row => (
                  <TableRow
                    key={row.id}
                    className={ids.includes(row.id) ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={t('admin.promotions.bulk.select', { code: row.code })}
                        checked={ids.includes(row.id)}
                        onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? [...new Set([...ids, row.id])] : ids.filter(id => id !== row.id) })}
                      />
                    </TableCell>
                    <TableCell className="min-w-64">
                      <button
                        onClick={() => setModal({ kind: 'detail', id: row.id })}
                        className="rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary hover:bg-primary/20"
                      >
                        {row.code}
                      </button>
                      <p className="mt-2 max-w-72 break-words text-sm text-muted-foreground">
                        {row.description || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-44 whitespace-nowrap">
                      <p className="font-semibold">
                        {row.discountType === 1 ? `${formatNumber(row.discountValue)}%` : formatCurrency(row.discountValue)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(`admin.promotions.types.${row.discountType}`)}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-56">
                      <p>
                        {t('admin.promotions.minimum', { value: formatCurrency(row.minOrderAmount) })}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('admin.promotions.maximum', { value: row.maxDiscountAmount == null ? t('admin.promotions.unlimited') : formatCurrency(row.maxDiscountAmount) })}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-56">
                      <p>
                        {formatPromotionTime(row.startAt)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('admin.promotions.until', { value: formatPromotionTime(row.endAt) })}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <p className="font-semibold">
                        {formatNumber(row.usedCount)}
                        {' '}
                        /
                        {' '}
                        {row.usageLimit == null ? '∞' : formatNumber(row.usageLimit)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('admin.promotions.perCustomer', { value: row.usageLimitPerCustomer ?? t('admin.promotions.unlimited') })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(row.status)}`}>
                        {t(`admin.promotions.statuses.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            size="icon"
                            variant="secondary"
                            className="size-10 rounded-xl"
                            aria-label={t('admin.promotions.actionsFor', { code: row.code })}
                            disabled={opening}
                          />
                        )}
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setModal({ kind: 'detail', id: row.id })}>
                            <Eye size={16} />
                            {t('admin.promotions.detail')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => edit(row.id)}>
                            <Pencil size={16} />
                            {t('admin.promotions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setModal({ kind: 'toggle', id: row.id })}>
                            <Power size={16} />
                            {t(row.isActive ? 'admin.promotions.deactivate' : 'admin.promotions.activate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setModal({ kind: 'delete', id: row.id })}
                            disabled={row.usedCount > 0}
                            className="text-destructive"
                          >
                            <Trash2 size={16} />
                            {t('admin.promotions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={query.page}
              totalPages={resource.data.totalPages}
              total={resource.data.total}
              pageSize={TAKE}
              rowCount={resource.data.list.length}
              onPageChange={page => update({ page })}
            />
          </>
        )}
        {!resource.loading && !resource.error && resource.data && !resource.data.list.length && query.page > 1 && (
          <Button
            variant="outline"
            className="m-5"
            onClick={() => update({ page: 1 })}
          >
            {t('admin.promotions.firstPage')}
          </Button>
        )}
      </section>
      {current && (current.kind === 'bulk' ? (
        <PromotionBulkDialog
          promotions={current.promotions}
          onSaved={saved}
          onClose={close}
        />
      ) : ['create', 'edit'].includes(current.kind) ? (
        <PromotionEditor
          key={current.value?.id || 'create'}
          value={current.value}
          onClose={close}
          onSaved={saved}
        />
      ) : (
        <PromotionDialog
          key={`${current.id}:${current.kind}`}
          id={current.id}
          kind={current.kind}
          onClose={close}
          onSaved={saved}
        />
      ))}
    </Reveal>
  )
}
