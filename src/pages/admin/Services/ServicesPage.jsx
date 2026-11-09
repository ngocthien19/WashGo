import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shirt, Plus, RefreshCw, MoreHorizontal, Eye, Pencil, CircleCheck, Power, FileClock, Trash2, Layers, X, Store } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import StatCard from '~/components/workspace/StatCard'
import TablePagination from '~/components/Pagination/TablePagination'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Reveal from '~/components/motion/Reveal'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminServiceApi } from '~/apis/admin/adminServiceApi'
import { SERVICE_TYPES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { readQuery, writeQuery, filter, approvalClass, serviceSortOptions, SERVICE_TAKE } from './serviceModel'
import ServiceEditor from './components/ServiceEditor'
import ServiceRecordDialog from './components/ServiceRecordDialog'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { Checkbox } from '~/components/ui/checkbox'
import ServiceBulkDialog from './components/ServiceBulkDialog'

const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
export default function ServicesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readQuery(params), [params]), catalog = query.tab === 'catalog'
  const load = useCallback(signal => adminServiceApi[query.tab](filter(query), signal), [query])
  const loadMerchants = useCallback(signal => catalog ? Promise.resolve([]) : adminServiceApi.merchants(signal), [catalog])
  const resource = useCatalogResource(load), summary = useCatalogResource(adminServiceApi.summary), merchants = useCatalogResource(loadMerchants)
  const [modal, setModal] = useState(null), [opening, setOpening] = useState(false)
  const [selection, setSelection] = useState({ source: null, ids: [] })
  const rows = resource.data?.list || []
  const ids = catalog && selection.source === resource.data && !resource.loading ? selection.ids : []
  const selected = rows.filter(row => ids.includes(row.id))
  const linked = isId(params.get('proposal')) ? { kind: 'proposal', id: params.get('proposal') } : isId(params.get('service')) ? { kind: 'detail', id: params.get('service') } : null
  const currentModal = modal || linked
  const update = patch => setParams(writeQuery({ ...query, ...patch, page: patch.page || 1 }))
  const close = () => {
    setModal(null); if (linked) {
      const next = new URLSearchParams(params); next.delete('proposal'); next.delete('service'); setParams(next, { replace: true })
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
      setModal({ kind: 'edit', service: await adminServiceApi.service(id) })
    } catch (error) {
      notify.error(getApiError(error))
    } finally {
      setOpening(false)
    }
  }
  useEffect(() => {
    document.title = `${t('admin.nav.services')} | WashGo`
  }, [t])
  const options = [
    { key: 'type', label: catalog ? 'merchant.services.category' : 'merchant.services.requestType', values: catalog ? SERVICE_TYPES.filter(item => item.value !== '').map(item => ({ value: String(item.value), label: t(item.label) })) : [1, 2].map(value => ({ value: String(value), label: t(`merchant.services.requestTypes.${value}`) })) },
    { key: 'state', label: catalog ? 'merchant.services.activityLabel' : 'merchant.services.approvalLabel', values: (catalog ? ['true', 'false'] : ['1', '2', '3']).map(value => ({ value, label: t(catalog ? `merchant.services.activity.${value}` : `merchant.services.approval.${value}`) })) }
  ]
  const merchantOptions = merchants.data || []
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Shirt className="text-primary" />
            {t('admin.nav.services')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('admin.services.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={resource.loading || summary.loading}
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
            {t('admin.services.create')}
          </Button>
        </div>
      </header>
      {summary.loading || summary.error || !summary.data ? (
        <ResourceFeedback
          {...summary}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[['total', Shirt, 'primary'], ['active', CircleCheck, 'emerald'], ['inactive', Power, 'slate'], ['pending', FileClock, 'amber']].map(([key, Icon], index) => (
            <StatCard
              key={key}
              icon={Icon}
              label={t(`admin.services.summary.${key}`)}
              value={summary.data[index]}
              className={['border-l-primary', 'border-l-emerald-500', 'border-l-slate-400', 'border-l-amber-500'][index]}
              iconClassName={['bg-primary/10 text-primary', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 'bg-muted text-muted-foreground', 'bg-amber-500/10 text-amber-700 dark:text-amber-300'][index]}
            />
          ))}
        </div>
      )}
      <div
        role="tablist"
        aria-label={t('admin.services.tabsLabel')}
        className="flex gap-4 overflow-x-auto border-b border-border"
      >
        {['catalog', 'proposals'].map(tab => (
          <Button
            key={tab}
            role="tab"
            aria-selected={query.tab === tab}
            variant="ghost"
            onClick={() => update({ tab, keyword: '', state: '', type: '', approval: '', merchantId: '', serviceId: '', sort: 'name' })}
            className={`h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 text-lg font-medium hover:bg-transparent dark:hover:bg-transparent ${query.tab === tab ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
          >
            {t(`admin.services.tabs.${tab}`)}
          </Button>
        ))}
      </div>
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2">
          <p className="text-sm">
            {t('admin.services.search')}
          </p>
          <CatalogToolbar
            embedded
            label={t('admin.services.search')}
            placeholder={t('admin.services.searchHint')}
            keyword={query.keyword}
            onSearch={keyword => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        {options.map(({ key, label, values }) => (
          <label
            key={key}
            className="grid gap-2 text-sm"
          >
            <span>
              {t(label)}
            </span>
            <SelectField
              label={t(label)}
              value={query[key]}
              onValueChange={value => update({ [key]: value })}
              options={[{ value: '', label: t('common.all') }, ...values]}
            />
          </label>
        ))}
        {!catalog && (
          <label className="grid gap-2 text-sm">
            <span>
              {t('admin.services.merchant')}
            </span>
            <SelectField
              label={t('admin.services.merchant')}
              disabled={merchants.loading || !!merchants.error}
              value={query.merchantId}
              onValueChange={merchantId => update({ merchantId })}
              options={[{ value: '', label: t('common.all') }, ...merchantOptions.map(row => ({ value: row.id, label: row.name })), ...(query.merchantId && !merchantOptions.some(row => row.id === query.merchantId) ? [{ value: query.merchantId, label: query.merchantId }] : [])]}
            />
          </label>
        )}
        {catalog && (
          <label className="grid gap-2 text-sm">
            <span>
              {t('merchant.services.approvalLabel')}
            </span>
            <SelectField
              label={t('merchant.services.approvalLabel')}
              value={query.approval}
              onValueChange={approval => update({ approval })}
              options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map(value => ({ value: String(value), label: t(`merchant.services.approval.${value}`) }))]}
            />
          </label>
        )}
        {!catalog && merchants.error && <ResourceFeedback {...merchants} />}
      </section>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-semibold text-primary">
            {t('admin.services.selected', { count: selected.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setModal({ kind: 'bulk', services: selected })}
              className="h-11 px-5 text-base"
            >
              <Layers size={18} />
              {t('admin.services.bulk')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('admin.services.clearSelection')}
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <p>
            <strong className="mr-2 text-2xl">
              {resource.loading || resource.error ? '—' : resource.data?.total}
            </strong>
            {t(catalog ? 'admin.services.results' : 'admin.services.proposalResults')}
          </p>
          {catalog && (
            <SelectField
              label={t('merchant.serviceSync.sortLabel')}
              value={query.sort}
              onValueChange={sort => update({ sort })}
              className="workspace-filters w-52"
              options={Object.keys(serviceSortOptions).map(value => ({ value, label: t(`merchant.serviceSync.sort.${value}`) }))}
            />
          )}
        </div>
        {resource.loading || resource.error || !resource.data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
            empty="admin.services.empty"
          />
        ) : (
          <>
            <Table
              className="min-w-[1150px] text-base"
              aria-label={t('admin.nav.services')}
            >
              <TableHeader>
                <TableRow>
                  {catalog && (
                    <TableHead className={`${headerBg} w-14`}>
                      <Checkbox
                        aria-label={t('admin.services.selectPage')}
                        checked={rows.length > 0 && ids.length === rows.length}
                        indeterminate={ids.length > 0 && ids.length < rows.length}
                        onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? rows.map(row => row.id) : [] })}
                      />
                    </TableHead>
                  )}
                  {(catalog ? ['service', 'category', 'price', 'duration', 'approval', 'activity', 'actions'] : ['service', 'category', 'merchant', 'request', 'created', 'approval', 'actions']).map(key => (
                    <TableHead
                      key={key}
                      className={`${headerBg} ${key === 'price' ? 'min-w-[200px] whitespace-nowrap' : ''} ${key === 'actions' ? 'sticky right-0 z-20 w-24 border-l border-border text-center' : ''}`}
                    >
                      {t(`admin.services.columns.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resource.data.list.map(row => {
                  const value = catalog ? row : row.proposed
                  return (
                    <TableRow
                      key={row.id}
                      className={ids.includes(row.id) ? 'bg-primary/5' : ''}
                    >
                      {catalog && (
                        <TableCell>
                          <Checkbox
                            aria-label={t('admin.services.selectService', { name: row.name })}
                            checked={ids.includes(row.id)}
                            onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? [...new Set([...ids, row.id])] : ids.filter(id => id !== row.id) })}
                          />
                        </TableCell>
                      )}
                      <TableCell className="min-w-72">
                        <div className="flex items-center gap-3">
                          <ResourceThumbnail
                            urls={value.imageUrls}
                            name={value.name}
                            icon={Shirt}
                          />
                          <div>
                            <p className="font-semibold">
                              {value.name}
                            </p>
                            {catalog && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {row.code}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {catalog ? (
                        <>
                          <TableCell>
                            {t(SERVICE_TYPES.find(item => Number(item.value) === row.serviceType)?.label || 'merchant.services.unknown')}
                          </TableCell>
                          <TableCell className="min-w-[200px] whitespace-nowrap font-semibold">
                            {formatCurrency(row.unitPrice)}
                            <p className="mt-1 text-sm font-normal text-muted-foreground">
                              /
                              {row.unit}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {t('merchant.services.hours', { count: row.estimatedDurationHours })}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="min-w-40 whitespace-nowrap">
                            {t(SERVICE_TYPES.find(item => item.value !== '' && Number(item.value) === value.serviceType)?.label || 'merchant.services.unknown')}
                          </TableCell>
                          <TableCell className="min-w-52">
                            <div className="flex items-center gap-3">
                              <ResourceThumbnail
                                urls={row.merchantImageUrls || merchantOptions.find(merchant => merchant.id === row.merchantId)?.imageUrls || []}
                                name={row.merchantName}
                                icon={Store}
                              />
                              <span className="font-semibold">
                                {row.merchantName || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {t(`merchant.services.requestTypes.${row.requestType}`)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDateTime(row.createdAt)}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${approvalClass(catalog ? row.approvalStatus : row.status)}`}>
                          {t(`merchant.services.approval.${catalog ? row.approvalStatus : row.status}`)}
                        </span>
                      </TableCell>
                      {catalog && (
                        <TableCell>
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${row.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                            {t(`merchant.services.activity.${row.isActive}`)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={(
                            <Button
                              size="icon"
                              variant="secondary"
                              className="size-10 rounded-xl"
                              aria-label={t('admin.services.actionsFor', { name: value.name })}
                            />
                          )}
                          >
                            <MoreHorizontal size={19} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setModal({ kind: catalog ? 'detail' : 'proposal', id: row.id })}>
                              <Eye
                                size={17}
                                className="text-primary"
                              />
                              {t(catalog ? 'merchant.services.details' : 'merchant.services.proposalDetails')}
                            </DropdownMenuItem>
                            {catalog && (
                              <DropdownMenuItem
                                disabled={opening}
                                onClick={() => edit(row.id)}
                              >
                                <Pencil
                                  size={17}
                                  className="text-violet-600"
                                />
                                {t('admin.services.edit')}
                              </DropdownMenuItem>
                            )}
                            {catalog && (
                              <>
                                <DropdownMenuItem
                                  disabled={row.approvalStatus !== 2}
                                  onClick={() => setModal({ kind: 'toggle', id: row.id })}
                                >
                                  <Power
                                    size={17}
                                    className={row.isActive ? 'text-amber-600' : 'text-emerald-600'}
                                  />
                                  {t(row.isActive ? 'admin.services.deactivate' : 'admin.services.activate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setModal({ kind: 'delete', id: row.id })}
                                  className="text-destructive"
                                >
                                  <Trash2 size={17} />
                                  {t('admin.services.delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={query.page}
              totalPages={resource.data.totalPages}
              total={resource.data.total}
              rowCount={resource.data.list.length}
              pageSize={SERVICE_TAKE}
              onPageChange={page => update({ page })}
            />
          </>
        )}
      </section>
      {currentModal && ['create', 'edit'].includes(currentModal.kind) && (
        <ServiceEditor
          key={currentModal.service?.id || 'new'}
          service={currentModal.service}
          onClose={close}
          onSaved={saved}
        />
      )}
      {currentModal && ['detail', 'proposal', 'toggle', 'delete'].includes(currentModal.kind) && (
        <ServiceRecordDialog
          key={`${currentModal.kind}-${currentModal.id}`}
          id={currentModal.id}
          kind={currentModal.kind}
          merchants={merchantOptions}
          onClose={close}
          onSaved={saved}
        />
      )}
      {currentModal?.kind === 'bulk' && (
        <ServiceBulkDialog
          services={currentModal.services}
          onClose={close}
        />
      )}
    </Reveal>
  )
}
