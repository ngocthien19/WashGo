import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Store, CircleCheck, PauseCircle, Ban, Plus, RefreshCw, MoreHorizontal, Eye, Pencil, LockKeyhole, LockKeyholeOpen, FileCheck, X } from 'lucide-react'
import StatCard from '~/components/workspace/StatCard'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import TablePagination from '~/components/Pagination/TablePagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import useCatalogResource from '~/hooks/useCatalogResource'
import Reveal from '~/components/motion/Reveal'
import { adminMerchantApi } from '~/apis/admin/adminMerchantApi'
import { formatDateTime, formatNumber } from '~/utils/formats'
import { MERCHANT_TAKE, isId, readMerchantQuery, merchantFilter } from './merchantModel'
import MerchantEditor from './components/MerchantEditor'
import MerchantRecordDialog, { MerchantStatus } from './components/MerchantDialogs'
import ProfileRequestDialog from './components/ProfileRequestDialog'

const summaryIcons = [Store, CircleCheck, PauseCircle, Ban]
const summaryKeys = ['total', 'active', 'inactive', 'suspended']
const tableHeaderBackground = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
const summaryColors = [['border-l-primary', 'bg-primary/10 text-primary'], ['border-l-emerald-500', 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'], ['border-l-slate-400', 'bg-slate-500/10 text-slate-600 dark:text-slate-300'], ['border-l-rose-400', 'bg-rose-500/10 text-rose-600 dark:text-rose-300']]

export default function MerchantsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readMerchantQuery(params), [params])
  const [revision, setRevision] = useState(0), [selected, setDialog] = useState(null)
  const dialog = selected || (isId(params.get('request')) ? { kind: 'request', id: params.get('request') } : isId(params.get('merchant')) ? { kind: 'detail', id: params.get('merchant') } : null)
  const merchants = query.tab === 'merchants'
  const load = useCallback((signal) => adminMerchantApi[merchants ? 'list' : 'requests'](merchantFilter(query), signal), [query, merchants])
  const resource = useCatalogResource(load, revision)
  const summary = useCatalogResource(adminMerchantApi.summary, revision)
  const cities = useCatalogResource(adminMerchantApi.cities, revision)
  const cityOptions = [...new Set([...(cities.data || []), ...(query.city ? [query.city] : [])])].map((city) => ({ value: city, label: city }))
  const update = useCallback((patch) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(patch)) {
      if (value !== '' && value != null) {
        next.set(key, String(value))
      } else {
        next.delete(key)
      }
    }
    setParams(next)
  }, [params, setParams])
  useEffect(() => {
    document.title = `${t('admin.nav.merchants')} | WashGo`
  }, [t])
  useEffect(() => {
    if (!resource.loading && !resource.error && resource.data && query.page > Math.max(1, resource.data.totalPages)) {
      update({ page: Math.max(1, resource.data.totalPages) })
    }
  }, [resource.loading, resource.error, resource.data, query.page, update])
  const reload = () => setRevision((value) => value + 1)
  const close = () => {
    setDialog(null)
    if (params.has('request') || params.has('merchant')) {
      update({ request: '', merchant: '' })
    }
    reload()
  }
  const disabled = resource.loading
  const actions = (row) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={(
        <Button
          variant="secondary"
          size="icon"
          className="size-10 rounded-xl"
          aria-label={t('admin.merchants.actionsFor', { name: row.businessName || row.merchantName })}
        />
      )}
      >
        <MoreHorizontal size={19} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDialog({ kind: merchants ? 'detail' : 'request', id: row.id })}>
          <Eye size={16} />
          {t('admin.merchants.details')}
        </DropdownMenuItem>
        {merchants && (
          <>
            <DropdownMenuItem onClick={() => setDialog({ kind: 'edit', id: row.id })}>
              <Pencil size={16} />
              {t('admin.merchants.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={row.status === 1 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}
              onClick={() => setDialog({ kind: 'status', id: row.id })}
            >
              {row.status === 1 ? <LockKeyhole size={16} /> : <LockKeyholeOpen size={16} />}
              {t(row.status === 1 ? 'admin.merchants.lock' : 'admin.merchants.unlock')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ tab: 'requests', merchantId: row.id, state: '', keyword: '', city: '', district: '' })}>
              <FileCheck size={16} />
              {t('admin.merchants.requests')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Store className="text-primary" />
            {t('admin.nav.merchants')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('admin.merchants.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-11 px-5 text-base"
            disabled={disabled}
            onClick={reload}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            className="h-11 px-5 text-base font-semibold"
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Plus size={18} />
            {t('admin.merchants.create')}
          </Button>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryKeys.map((key, i) => (
          <StatCard
            key={key}
            icon={summaryIcons[i]}
            label={t(`admin.merchants.summary.${key}`)}
            value={summary.loading ? '…' : summary.error ? '—' : summary.data?.counts[i]}
            className={summaryColors[i][0]}
            iconClassName={summaryColors[i][1]}
          />
        ))}
      </div>
      {summary.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-sm text-destructive"
        >
          <span>
            {t('admin.merchants.summaryError')}
          </span>
          <Button
            variant="outline"
            className="h-10"
            onClick={summary.retry}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
      <div
        role="tablist"
        aria-label={t('admin.nav.merchants')}
        className="flex flex-wrap gap-3 border-b border-border"
      >
        {['merchants', 'requests'].map((tab) => (
          <Button
            key={tab}
            role="tab"
            aria-selected={query.tab === tab}
            variant="ghost"
            className={`h-12 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-4 text-lg font-medium hover:bg-transparent dark:hover:bg-transparent ${query.tab === tab ? 'border-b-primary text-primary hover:text-primary' : 'border-b-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => update({ tab, state: '', keyword: '', city: '', district: '', merchantId: '' })}
          >
            {t(`admin.merchants.${tab}`)}
            {tab === 'requests' && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {summary.data?.pending ?? '—'}
              </span>
            )}
          </Button>
        ))}
      </div>
      <section className="workspace-filters space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className={`grid items-end gap-4 ${merchants ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
          {merchants && (
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">
                {t('admin.merchants.searchLabel')}
              </p>
              <CatalogToolbar
                embedded
                keyword={query.keyword}
                onSearch={(keyword) => update({ keyword })}
                label={t('admin.merchants.search')}
                placeholder={t('admin.merchants.search')}
                formClassName="h-11 py-0.5"
              />
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor="merchant-status-filter"
              className="block text-sm font-medium"
            >
              {t('admin.merchants.status')}
            </label>
            <SelectField
              id="merchant-status-filter"
              label={t('admin.merchants.status')}
              value={query.state}
              onValueChange={(state) => update({ state })}
              options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map((value) => ({ value: String(value), label: t(`admin.merchants.${merchants ? 'statuses' : 'requestStates'}.${value}`) }))]}
            />
          </div>
          {merchants && (
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="merchant-city-filter"
                className="text-sm font-medium"
              >
                {t('admin.merchants.fields.city')}
              </label>
              <SelectField
                id="merchant-city-filter"
                label={t('admin.merchants.fields.city')}
                value={query.city}
                disabled={cities.loading || !!cities.error}
                onValueChange={(city) => update({ city, district: '' })}
                options={[{ value: '', label: t(cities.loading ? 'admin.loading' : 'common.all') }, ...cityOptions]}
              />
            </div>
          )}
        </div>
        {merchants && cities.error && (
          <Button
            variant="link"
            className="h-auto p-0 text-sm text-destructive"
            onClick={cities.retry}
          >
            {t('common.tryAgain')}
            :
            {t('admin.merchants.fields.city')}
          </Button>
        )}
        {(query.keyword || query.city || query.district || query.state || query.merchantId) && (
          <div className="flex flex-wrap items-center gap-3">
            {query.merchantId && (
              <span className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                {t('admin.merchants.merchantScope')}
              </span>
            )}
            <Button
              variant="ghost"
              className="h-10"
              onClick={() => update({ keyword: '', city: '', district: '', state: '', merchantId: '' })}
            >
              <X size={16} />
              {t('admin.merchants.clear')}
            </Button>
          </div>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-5 text-base">
          <strong className="mr-2 text-2xl tabular-nums">
            {resource.data ? formatNumber(resource.data.total) : '—'}
          </strong>
          {t(merchants ? 'admin.merchants.results' : 'admin.merchants.requestResults')}
        </div>
        {resource.loading || resource.error || !resource.data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="admin.loading"
            empty="admin.merchants.empty"
          />
        ) : (
          <>
            <Table
              aria-label={t(merchants ? 'admin.merchants.merchants' : 'admin.merchants.requests')}
              className="min-w-[1000px]"
            >
              <TableHeader className="bg-muted">
                <TableRow>
                  {(merchants ? ['businessName', 'region', 'status', 'totalOrders', 'unfinishedOrders'] : ['businessName', 'submittedAt', 'changedFields', 'status']).map((key) => (
                    <TableHead
                      key={key}
                      className={`${tableHeaderBackground} px-5 py-4 font-semibold`}
                    >
                      {t(`admin.merchants.${key}`)}
                    </TableHead>
                  ))}
                  <TableHead className={`${tableHeaderBackground} sticky right-0 z-20 w-24 border-l border-border px-5 py-4 text-center font-semibold`}>
                    {t('admin.merchants.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resource.data.list.map((row) => (
                  <TableRow key={row.id}>
                    {merchants ? (
                      <>
                        <TableCell className="max-w-[330px] px-5 py-5">
                          <div className="flex items-center gap-3">
                            <ResourceThumbnail
                              urls={row.imageUrls}
                              name={row.businessName}
                              icon={Store}
                            />
                            <div className="min-w-0">
                              <p className="break-words text-base font-bold">
                                {row.businessName}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {row.phone}
                              </p>
                              <p className="mt-1 break-all text-xs text-muted-foreground">
                                {row.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal px-5 py-5 text-base">
                          <p className="font-semibold">
                            {row.city || '—'}
                          </p>
                          <p className="mt-1 text-base leading-6 text-muted-foreground">
                            {row.address}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-5">
                          <MerchantStatus status={row.status} />
                        </TableCell>
                        <TableCell className="px-5 py-5 font-bold tabular-nums">
                          {formatNumber(row.totalOrders)}
                        </TableCell>
                        <TableCell className="px-5 py-5 font-bold tabular-nums">
                          {formatNumber(row.unfinishedOrders)}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="max-w-72 whitespace-normal px-5 py-5 font-bold">
                          {row.merchantName}
                        </TableCell>
                        <TableCell className="px-5 py-5 text-sm text-muted-foreground">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-72 whitespace-normal px-5 py-5 text-xs leading-6">
                          {row.changedFields.map((key) => t(`admin.merchants.fields.${key.charAt(0).toLowerCase() + key.slice(1)}`, { defaultValue: key })).join(', ')}
                        </TableCell>
                        <TableCell className="px-5 py-5">
                          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                            {t(`admin.merchants.requestStates.${row.status}`)}
                          </span>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card px-5 py-5 text-center">
                      {actions(row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={query.page}
              totalPages={resource.data.totalPages}
              onPageChange={(page) => update({ page })}
              total={resource.data.total}
              pageSize={MERCHANT_TAKE}
              rowCount={resource.data.list.length}
            />
          </>
        )}
      </section>
      {dialog?.kind === 'create' && (
        <MerchantEditor
          onClose={close}
          onSaved={close}
        />
      )}
      {dialog?.kind === 'request' && (
        <ProfileRequestDialog
          id={dialog.id}
          onClose={close}
          onSaved={close}
        />
      )}
      {dialog && !['create', 'request'].includes(dialog.kind) && (
        <MerchantRecordDialog
          key={`${dialog.kind}:${dialog.id}`}
          {...dialog}
          onClose={close}
          onSaved={close}
        />
      )}
    </Reveal>
  )
}
