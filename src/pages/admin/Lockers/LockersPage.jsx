import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, RefreshCw, Plus, Eye, History, Pencil, Trash2, MoreHorizontal, MapPin, RotateCcw, Layers, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import TablePagination from '~/components/Pagination/TablePagination'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import Reveal from '~/components/motion/Reveal'
import LockerSummary from '~/pages/merchant/Lockers/components/LockerSummary'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminLockerApi } from '~/apis/admin/adminLockerApi'
import { formatLockerAddress } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { readAdminLockerQuery, writeAdminLockerQuery, adminLockerFilter, lockerStateClass, lockerSortOptions, LOCKER_TAKE } from './lockerModel'
import LockerDetails from './components/LockerDetails'
import LockerEditor from './components/LockerEditor'
import LockerActionDialog from './components/LockerActionDialog'
import LockerBulkDialog from './components/LockerBulkDialog'
import { Checkbox } from '~/components/ui/checkbox'

const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
export default function LockersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readAdminLockerQuery(params), [params])
  const load = useCallback(signal => adminLockerApi.list(adminLockerFilter(query), signal), [query])
  const resource = useCatalogResource(load), summary = useCatalogResource(adminLockerApi.summary)
  const cities = useCatalogResource(adminLockerApi.cities), merchants = useCatalogResource(adminLockerApi.merchants)
  const [modal, setModal] = useState(null), [opening, setOpening] = useState(false)
  const [selection, setSelection] = useState({ source: null, ids: [] })
  const update = patch => setParams(writeAdminLockerQuery({ ...query, ...patch, page: patch.page || 1 }))
  const refresh = () => {
    resource.retry(); summary.retry(); cities.retry(); merchants.retry()
  }
  const saved = () => {
    setModal(null); refresh()
  }
  const open = async (kind, id) => {
    if (opening) {
      return
    }
    setOpening(true)
    try {
      setModal({ kind, locker: await adminLockerApi.detail(id) })
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setOpening(false)
    }
  }
  useEffect(() => {
    document.title = `${t('admin.nav.lockers')} | WashGo`
  }, [t])
  const cityOptions = [...new Set([...(cities.data || []), ...(query.city ? [query.city] : [])])]
  const merchantOptions = merchants.data || []
  const { data, loading, error } = resource
  const rows = data?.list || []
  const selectedIds = selection.source === data && !loading ? selection.ids : []
  const selectedRows = rows.filter(row => selectedIds.includes(row.id))
  const toggle = (id, checked) => setSelection({ source: data, ids: checked ? [...new Set([...selectedIds, id])] : selectedIds.filter(value => value !== id) })
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <PanelsTopLeft className="text-primary" />
            {t('admin.nav.lockers')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('admin.lockers.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={loading || summary.loading}
            className="h-11 px-4 text-base"
            onClick={refresh}
          >
            <RefreshCw size={18} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            disabled={merchants.loading || !!merchants.error}
            className="h-11 px-5 text-base"
            onClick={() => setModal({ kind: 'create' })}
          >
            <Plus size={18} />
            {t('admin.lockers.create')}
          </Button>
        </div>
      </header>
      <LockerSummary
        resource={summary}
        titleKey="admin.lockers.statistics"
      />
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            {t('merchant.lockers.search')}
          </p>
          <CatalogToolbar
            embedded
            keyword={query.keyword}
            label={t('merchant.lockers.search')}
            placeholder={t('merchant.lockers.searchHint')}
            onSearch={keyword => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span>
            {t('merchant.lockers.status')}
          </span>
          <SelectField
            label={t('merchant.lockers.status')}
            value={query.status}
            onValueChange={status => update({ status })}
            options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map(value => ({ value: String(value), label: t(`merchant.lockers.statuses.${value}`) }))]}
          />
        </label>
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span>
            {t('admin.lockers.fields.city')}
          </span>
          <SelectField
            label={t('admin.lockers.fields.city')}
            value={query.city}
            disabled={cities.loading || !!cities.error}
            onValueChange={city => update({ city })}
            options={[{ value: '', label: t('common.all') }, ...cityOptions.map(value => ({ value, label: value }))]}
          />
        </label>
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span>
            {t('admin.lockers.merchants')}
          </span>
          <SelectField
            label={t('admin.lockers.merchants')}
            value={query.merchantId}
            disabled={merchants.loading || !!merchants.error}
            onValueChange={merchantId => update({ merchantId })}
            options={[{ value: '', label: t('common.all') }, ...merchantOptions.map(row => ({ value: row.id, label: row.name })), ...(query.merchantId && !merchantOptions.some(row => row.id === query.merchantId) ? [{ value: query.merchantId, label: query.merchantId }] : [])]}
          />
        </label>
        {(cities.error || merchants.error) && (
          <div className="sm:col-span-2 xl:col-span-4">
            <ResourceFeedback
              loading={false}
              error={cities.error || merchants.error}
              retry={() => {
                cities.retry(); merchants.retry()
              }}
            />
          </div>
        )}
      </section>
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-base font-semibold text-primary">
            {t('admin.lockers.selected', { count: selectedRows.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 px-5 text-base"
              onClick={() => setModal({ kind: 'bulk', lockers: selectedRows })}
            >
              <Layers size={18} />
              {t('admin.lockers.bulkActions')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('admin.lockers.clearSelection')}
              onClick={() => setSelection({ source: null, ids: [] })}
            >
              <X size={19} />
            </Button>
          </div>
        </div>
      )}
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-busy={loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <p className="text-base text-muted-foreground">
            {!loading && !error && data && (
              <strong className="mr-2 text-2xl text-foreground">
                <AnimatedNumber value={data.total} />
              </strong>
            )}
            {t('merchant.lockers.results')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {(query.keyword || query.status || query.city || query.merchantId) && (
              <Button
                variant="ghost"
                className="h-11 text-base"
                onClick={() => update({ keyword: '', status: '', city: '', merchantId: '' })}
              >
                <RotateCcw size={18} />
                {t('merchant.orders.clear')}
              </Button>
            )}
            <SelectField
              label={t('customer.orders.sort')}
              value={query.sort}
              onValueChange={sort => update({ sort })}
              className="workspace-filters w-44"
              options={Object.keys(lockerSortOptions).map(value => ({ value, label: t(`merchant.lockers.sort.${value}`) }))}
            />
          </div>
        </div>
        {loading || error || !data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
            empty="admin.lockers.empty"
          />
        ) : (
          <>
            <Table
              aria-label={t('admin.nav.lockers')}
              className="min-w-[1350px] text-base"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className={`${headerBg} w-14`}>
                    <Checkbox
                      aria-label={t('admin.lockers.selectPage')}
                      checked={rows.length > 0 && selectedIds.length === rows.length}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length}
                      onCheckedChange={checked => setSelection({ source: data, ids: checked ? rows.map(row => row.id) : [] })}
                    />
                  </TableHead>
                  {['name', 'address', 'type', 'merchants', 'totalBoxes', 'emptyBoxes', 'status', 'actions'].map(key => (
                    <TableHead
                      key={key}
                      className={`${headerBg} ${key === 'actions' ? 'sticky right-0 z-20 w-24 border-l border-border text-center' : ''}`}
                    >
                      {t(key === 'merchants' ? 'admin.lockers.merchants' : `merchant.lockers.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map(locker => (
                  <TableRow
                    key={locker.id}
                    className={selectedIds.includes(locker.id) ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={t('admin.lockers.selectLocker', { name: locker.name })}
                        checked={selectedIds.includes(locker.id)}
                        onCheckedChange={checked => toggle(locker.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="min-w-72">
                      <div className="flex items-center gap-3">
                        <ResourceThumbnail
                          urls={locker.imageUrls}
                          name={locker.name}
                          icon={PanelsTopLeft}
                        />
                        <div>
                          <button
                            type="button"
                            className="cursor-pointer text-left font-semibold text-primary hover:underline"
                            onClick={() => setModal({ kind: 'details', id: locker.id })}
                          >
                            {locker.name}
                          </button>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {locker.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-72 max-w-96">
                      <p className="flex items-start gap-2">
                        <MapPin
                          size={17}
                          className="mt-1 shrink-0 text-primary"
                        />
                        <span>
                          {formatLockerAddress(locker)}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {t(`merchant.lockers.types.${locker.lockerType}`, { defaultValue: '—' })}
                    </TableCell>
                    <TableCell className="min-w-60">
                      {locker.merchants?.length ? (
                        <ol className="space-y-2">
                          {[...locker.merchants].sort((a, b) => a.priority - b.priority).map(m => (
                            <li
                              key={m.merchantId}
                              className="flex items-start gap-2"
                            >
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 text-sm font-semibold text-primary">
                                {m.priority}
                              </span>
                              <span>
                                {m.businessName}
                              </span>
                            </li>
                          ))}
                        </ol>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {locker.totalBoxes ?? '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {locker.emptyBoxesCount ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${lockerStateClass(locker.status)}`}>
                        {t(`merchant.lockers.statuses.${locker.status}`, { defaultValue: '—' })}
                      </span>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            variant="secondary"
                            size="icon"
                            className="size-10 rounded-xl"
                            aria-label={t('merchant.lockers.actionsNamed', { name: locker.name })}
                          />
                        )}
                        >
                          <MoreHorizontal size={20} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setModal({ kind: 'details', id: locker.id })}>
                            <Eye
                              size={17}
                              className="text-primary"
                            />
                            {t('merchant.lockers.details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setModal({ kind: 'history', id: locker.id })}>
                            <History
                              size={17}
                              className="text-emerald-600"
                            />
                            {t('merchant.lockers.history')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={opening || merchants.loading || !!merchants.error}
                            onClick={() => open('edit', locker.id)}
                          >
                            <Pencil
                              size={17}
                              className="text-violet-600"
                            />
                            {t('admin.lockers.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={opening}
                            onClick={() => open('delete', locker.id)}
                            className="text-destructive"
                          >
                            <Trash2 size={17} />
                            {t('admin.lockers.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={page => update({ page })}
              total={data.total}
              pageSize={LOCKER_TAKE}
              rowCount={data.list.length}
            />
          </>
        )}
      </section>
      {modal && ['details', 'history'].includes(modal.kind) && (
        <LockerDetails
          key={modal.id}
          id={modal.id}
          tab={modal.kind === 'history' ? 'history' : 'details'}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {!modal && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(params.get('locker') || '') && (
        <LockerDetails
          id={params.get('locker')}
          tab="details"
          onSaved={refresh}
          onClose={() => setParams(current => {
            const next = new URLSearchParams(current); next.delete('locker'); return next
          })}
        />
      )}
      {modal && ['create', 'edit'].includes(modal.kind) && (
        <LockerEditor
          key={modal.locker?.id || 'new'}
          locker={modal.locker}
          merchants={merchantOptions}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === 'delete' && (
        <LockerActionDialog
          locker={modal.locker}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === 'bulk' && (
        <LockerBulkDialog
          lockers={modal.lockers}
          onClose={() => setModal(null)}
        />
      )}
    </Reveal>
  )
}
