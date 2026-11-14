import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tabs } from '@base-ui/react/tabs'
import { Shirt, FileText, Plus, RefreshCw, MoreHorizontal, Eye, FilePenLine, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import TablePagination from '~/components/Pagination/TablePagination'
import Reveal from '~/components/motion/Reveal'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantServiceApi } from '~/apis/merchant/merchantServiceApi'
import { SERVICE_TYPES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { SERVICE_TAKE, readServiceQuery, serviceFilter, approvalClass, serviceSortOptions } from './serviceModel'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import ServiceSummary from './components/ServiceSummary'
import ServiceDialog from './components/ServiceDialog'
import ProposalEditor from './components/ProposalEditor'

export default function ServicesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readServiceQuery(params), [params])
  const catalog = query.tab === 'catalog'
  const load = useCallback((signal) => merchantServiceApi[query.tab](serviceFilter(query), signal), [query])
  const loadSummary = useCallback((signal) => merchantServiceApi.summary(signal), [])
  const resource = useCatalogResource(load)
  const summary = useCatalogResource(loadSummary)
  const { data, loading, error } = resource
  const [selected, setSelected] = useState(null)
  const [editor, setEditor] = useState(null)
  useEffect(() => {
    document.title = `${t('merchant.nav.services')} | WashGo`
  }, [t])
  const update = (patch) => {
    const next = { ...query, ...patch, page: patch.page || 1 }
    setParams(Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1) && !(key === 'tab' && value === 'catalog') && !(key === 'sort' && value === 'name')).map(([key, value]) => [key, String(value)])))
  }
  const closeEditor = () => {
    setEditor(null); resource.retry(); summary.retry()
  }
  const editService = (service) => {
    setSelected(null); setEditor(service)
  }
  const categoryLabel = (value) => t(SERVICE_TYPES.find((item) => Number(item.value) === value)?.label || 'merchant.services.unknown')
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Shirt className="text-primary" />
            {t('merchant.nav.services')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('merchant.services.sharedHint')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={loading || summary.loading}
            onClick={() => {
              resource.retry(); summary.retry()
            }}
            className="h-11 px-4 text-base"
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            onClick={() => setEditor({})}
            className="h-11 px-4 text-base"
          >
            <Plus size={18} />
            {t('merchant.services.proposeNew')}
          </Button>
        </div>
      </header>
      <ServiceSummary resource={summary} />
      <Tabs.Root
        value={query.tab}
        onValueChange={(tab) => update({ tab, keyword: '', state: '', type: '', sort: 'name', serviceId: '' })}
        className="grid gap-6"
      >
        <Tabs.List
          activateOnFocus
          aria-label={t('merchant.services.views')}
          className="grid grid-cols-2 gap-3 border-b border-border"
        >
          {[['catalog', Shirt], ['proposals', FileText]].map(([key, Icon]) => (
            <Tabs.Tab
              key={key}
              value={key}
              className="-mb-px flex cursor-pointer items-center justify-center gap-2 border-b-2 border-transparent px-2 py-4 text-base font-medium text-muted-foreground outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary data-active:border-primary data-active:font-semibold data-active:text-primary"
            >
              <Icon size={18} />
              {t(`merchant.services.tabs.${key}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel
          value={query.tab}
          className="grid gap-6 outline-none"
        >
          <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 font-semibold shadow-sm [&_input]:font-semibold [&_input::placeholder]:font-semibold sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">
                {t('merchant.services.search')}
              </p>
              <CatalogToolbar
                suggestionSource={merchantServiceApi[query.tab]}
                suggestionFilter={serviceFilter(query)}
                suggestionKind="service"
                embedded
                keyword={query.keyword}
                label={t('merchant.services.search')}
                placeholder={t('merchant.services.searchHint')}
                onSearch={(keyword) => update({ keyword })}
                formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="service-type-filter"
                className="text-sm text-muted-foreground"
              >
                {t(catalog ? 'merchant.services.category' : 'merchant.services.requestType')}
              </label>
              <SelectField
                id="service-type-filter"
                label={t(catalog ? 'merchant.services.category' : 'merchant.services.requestType')}
                value={query.type}
                onValueChange={(type) => update({ type })}
                options={[{ value: '', label: t('common.all') }, ...(catalog ? SERVICE_TYPES.filter((item) => item.value).map((item) => ({ value: item.value, label: t(item.label) })) : [1, 2].map((value) => ({ value: String(value), label: t(`merchant.services.requestTypes.${value}`) })))]}
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="service-state-filter"
                className="text-sm text-muted-foreground"
              >
                {t(catalog ? 'merchant.services.activityLabel' : 'merchant.services.approvalLabel')}
              </label>
              <SelectField
                id="service-state-filter"
                label={t(catalog ? 'merchant.services.activityLabel' : 'merchant.services.approvalLabel')}
                value={query.state}
                onValueChange={(state) => update({ state })}
                options={[{ value: '', label: t('common.all') }, ...(catalog ? ['true', 'false'] : ['1', '2', '3']).map((value) => ({ value, label: t(`merchant.services.${catalog ? 'activity' : 'approval'}.${value}`) }))]}
              />
            </div>
          </section>
          <section
            data-pagination-scope
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            aria-busy={loading}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <p className="text-base text-muted-foreground">
                {!loading && !error && data && (
                  <strong className="mr-2 text-2xl text-foreground">
                    <AnimatedNumber value={data.total} />
                  </strong>
                )}
                {t(catalog ? 'merchant.services.results' : 'merchant.services.proposalResults')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {catalog && (
                  <SelectField
                    label={t('merchant.serviceSync.sortLabel')}
                    className="workspace-filters w-52 font-medium"
                    value={query.sort}
                    onValueChange={(sort) => update({ sort })}
                    options={Object.keys(serviceSortOptions).map((value) => ({ value, label: t(`merchant.serviceSync.sort.${value}`) }))}
                  />
                )}
                {query.serviceId && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    {t('merchant.serviceSync.filteredService')}
                  </span>
                )}
                {(query.keyword || query.state || query.type || query.serviceId || query.sort !== 'name') && (
                  <Button
                    variant="ghost"
                    onClick={() => update({ keyword: '', state: '', type: '', sort: 'name', serviceId: '' })}
                    className="h-11 text-base"
                  >
                    <RotateCcw size={17} />
                    {t('merchant.orders.clear')}
                  </Button>
                )}
              </div>
            </div>
            {loading || error || !data?.list.length ? (
              <ResourceFeedback
                {...resource}
                loadingText="merchant.loading"
                empty={catalog ? 'merchant.services.empty' : 'merchant.services.noProposals'}
              />
            ) : (
              <>
                <Table
                  className="min-w-[950px] text-base"
                  aria-label={t(`merchant.services.tabs.${query.tab}`)}
                >
                  <TableHeader>
                    <TableRow>
                      {(catalog ? ['name', 'category', 'unitPrice', 'duration', 'unit', 'activityLabel', 'actions'] : ['name', 'requestType', 'unitPrice', 'createdAt', 'approvalLabel', 'actions']).map((key) => (
                        <TableHead key={key}>
                          {t(`merchant.services.${key}`)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.list.map((row) => {
                      const service = catalog ? row : row.proposed
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <ResourceThumbnail
                                urls={service.imageUrls}
                                name={service.name}
                                icon={Shirt}
                              />
                              <div className="min-w-0">
                                <p className="font-bold">
                                  {service.name}
                                </p>
                                {catalog && (
                                  <div className="mt-1 grid gap-1">
                                    <p className="text-sm text-muted-foreground">
                                      {row.code}
                                    </p>
                                    {row.hasPendingProposal && (
                                      <span className="w-fit rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                        {t('merchant.serviceSync.pending')}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!catalog && row.rejectionReason && (
                                  <p className="mt-1 line-clamp-2 max-w-64 text-sm text-red-700 dark:text-red-300">
                                    {row.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {catalog ? categoryLabel(row.serviceType) : t(`merchant.services.requestTypes.${row.requestType}`, { defaultValue: '—' })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-semibold text-primary">
                            {formatCurrency(service.unitPrice)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {catalog ? t('merchant.services.hours', { count: row.estimatedDurationHours }) : formatDateTime(row.createdAt)}
                          </TableCell>
                          {catalog && (
                            <TableCell>
                              {row.unit}
                            </TableCell>
                          )}
                          <TableCell>
                            <span className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${catalog ? row.isActive ? approvalClass(2) : 'bg-muted text-muted-foreground' : approvalClass(row.status)}`}>
                              {t(`merchant.services.${catalog ? 'activity' : 'approval'}.${catalog ? row.isActive : row.status}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger render={(
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  aria-label={t('merchant.services.actionsNamed', { name: service.name })}
                                />
                              )}
                              >
                                <MoreHorizontal size={20} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setSelected({ kind: catalog ? 'service' : 'proposal', id: row.id, code: row.code })}>
                                  <Eye
                                    size={17}
                                    className="text-primary"
                                  />
                                  {t(catalog ? 'merchant.services.details' : 'merchant.services.proposalDetails')}
                                </DropdownMenuItem>
                                {catalog && (
                                  <DropdownMenuItem onClick={() => update({ tab: 'proposals', serviceId: row.id, keyword: '', state: '', type: '', sort: 'name' })}>
                                    <FileText
                                      size={17}
                                      className="text-primary"
                                    />
                                    {t('merchant.serviceSync.myServiceProposals')}
                                  </DropdownMenuItem>
                                )}
                                {catalog && (
                                  <DropdownMenuItem
                                    disabled={row.canProposeUpdate !== true || !row.version}
                                    onClick={() => setSelected({ kind: 'edit', id: row.id, code: row.code })}
                                  >
                                    <FilePenLine
                                      size={17}
                                      className="text-amber-600"
                                    />
                                    {t('merchant.services.proposeEdit')}
                                  </DropdownMenuItem>
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
                  totalPages={data.totalPages}
                  onPageChange={(page) => update({ page })}
                  total={data.total}
                  pageSize={SERVICE_TAKE}
                  rowCount={data.list.length}
                />
              </>
            )}
          </section>
        </Tabs.Panel>
      </Tabs.Root>
      {selected && (
        <ServiceDialog
          selected={selected}
          onClose={() => setSelected(null)}
          onEdit={editService}
        />
      )}
      {editor && (
        <ProposalEditor
          service={editor.id ? editor : null}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor(); update({ tab: 'proposals', keyword: '', state: '', type: '', sort: 'name', serviceId: '' })
          }}
        />
      )}
    </Reveal>
  )
}
