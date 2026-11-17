import RecordLink from '~/components/RecordLink'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import StatCard from '~/components/workspace/StatCard'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderTree, MoreHorizontal, CircleCheck, Plus, RefreshCw, Eye, Pencil, Power, Trash2, Layers, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import TablePagination from '~/components/Pagination/TablePagination'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminCategoryApi } from '~/apis/admin/adminCategoryApi'
import { categoryQuery } from './categoryModel'
import CategoryDialog from './CategoryDialog'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => categoryQuery(params), [params])
  const resource = useCatalogResource(useCallback(signal => adminCategoryApi.filter(query, signal), [query]))
  const summary = useCatalogResource(adminCategoryApi.summary)
  const [modal, setModal] = useState(null), [selection, setSelection] = useState({ source: null, ids: [] }), [pendingRevision, setPendingRevision] = useState(0)
  const rows = resource.data?.list || []
  const selected = resource.data === selection.source && !resource.loading ? rows.filter(row => selection.ids.includes(row.id)) : []
  const update = patch => {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(patch)) {
      if (value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    setParams(next)
  }
  useEffect(() => {
    document.title = `${t('categories.title')} | WashGo`
  }, [t])
  const refresh = () => {
    resource.retry(); summary.retry(); setSelection({ source: null, ids: [] }); setPendingRevision(value => value + 1)
  }
  const toggle = id => setSelection({ source: resource.data, ids: selected.some(row => row.id === id) ? selected.filter(row => row.id !== id).map(row => row.id) : [...selected.map(row => row.id), id] })
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 [&_button:not([role=combobox])]:text-base [&_button[role=combobox]]:text-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3  font-bold text-[30px]">
            <FolderTree className="text-primary" />
            {t('categories.title')}
          </h1>
          <p className="mt-2  text-muted-foreground text-[16px]">
            {t('categories.description')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-11"
            onClick={refresh}
          >
            <RefreshCw size={18} />
            {t('customer.orders.refresh')}
          </Button>
          <Button
            className="h-11"
            onClick={() => setModal({ kind: 'create', rows: [] })}
            disabled={adminCategoryApi.pending().some(item => item.key === 'new')}
          >
            <Plus size={18} />
            {t('categories.create')}
          </Button>
        </div>
      </header>
      {summary.loading || summary.error ? <ResourceFeedback {...summary} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[['total', FolderTree, 'primary'], ['active', CircleCheck, 'emerald'], ['inactive', Power, 'slate']].map(([key, Icon, color]) => (
            <StatCard
              key={key}
              icon={Icon}
              label={t(`categories.stats.${key}`)}
              value={summary.data?.[key]}
              className={color === 'primary' ? 'border-l-primary' : color === 'emerald' ? 'border-l-emerald-500' : 'border-l-slate-400'}
              iconClassName={color === 'primary' ? 'bg-primary/10 text-primary' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}
            />
          ))}
        </div>
      )}
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_auto]">
        <div className="grid gap-2">
          <h2 className="text-sm font-medium">
            {t('categories.searchLabel')}
          </h2>
          <CatalogToolbar
            embedded
            suggestionSource={adminCategoryApi.filter}
            suggestionFilter={query}
            suggestionKind="category"
            keyword={query.keyword}
            onSearch={keyword => update({ keyword })}
            label={t('categories.search')}
            placeholder={t('categories.search')}
          />
        </div>
        <div className="grid gap-2">
          <h2 className="text-sm font-medium">
            {t('categories.statusLabel')}
          </h2>
          <SelectField
            label={t('categories.statusLabel')}
            value={params.get('active') || ''}
            onValueChange={active => update({ active })}
            options={[{ value: '', label: t('common.all') }, { value: 'true', label: t('categories.active') }, { value: 'false', label: t('categories.inactive') }]}
          />
        </div>
        <ClearFiltersButton
          active={query.keyword || params.get('active') || query.isDescending || query.sortBy !== 'sortOrder'}
          onClear={() => setParams({})}
        />
      </section>
      <div
        data-pending-revision={pendingRevision}
        className="flex flex-wrap gap-3"
      >
        {adminCategoryApi.pending().map(intent => (
          <Button
            key={intent.key}
            variant="outline"
            onClick={() => setModal({ kind: intent.kind, intent })}
          >
            {t('categories.recover')}
          </Button>
        ))}
      </div>
      {!!selected.length && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <strong className="text-base text-primary">
            {t('categories.selected', { count: selected.length })}
          </strong>
          <div className="ml-auto flex items-center gap-3">
            <Button
              className="h-12 px-5"
              disabled={adminCategoryApi.pending().some(item => item.batch)}
              onClick={() => setModal({ kind: 'bulk', rows: selected })}
            >
              <Layers size={20} />
              {t('categories.bulk')}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('categories.clearSelection')}
              onClick={() => setSelection({ source: null, ids: [] })}
            >
              <X size={20} />
            </Button>
          </div>
        </section>
      )}
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card"
        data-pagination-scope
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <p role="status">
            <strong className="mr-2 text-2xl">
              {resource.loading || resource.error ? '—' : resource.data?.total ?? 0}
            </strong>
            {t('categories.found')}
          </p>
          <div className="workspace-filters grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium">
                {t('categories.sort')}
              </span>
              <SelectField
                label={t('categories.sort')}
                className="sm:w-52"
                value={query.sortBy}
                onValueChange={sort => update({ sort })}
                options={['sortOrder', 'name', 'code'].map(key => ({ value: key, label: t(`categories.fields.${key}`) }))}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">
                {t('categories.direction')}
              </span>
              <SelectField
                label={t('categories.direction')}
                className="sm:w-48"
                value={String(query.isDescending)}
                onValueChange={desc => update({ desc })}
                options={[{ value: 'false', label: t('categories.ascending') }, { value: 'true', label: t('categories.descending') }]}
              />
            </div>
          </div>
        </div>
        {resource.loading || resource.error || !rows.length ? (
          <div className="p-6">
            <ResourceFeedback
              {...resource}
              empty={t('categories.empty')}
            />
          </div>
        ) : (
          <>
            <CategoryTable
              rows={rows}
              selected={selected}
              resource={resource}
              setSelection={setSelection}
              toggle={toggle}
              setModal={setModal}
            />
          </>
        )}
        {resource.data && (
          <TablePagination
            currentPage={resource.data.currentPage}
            totalPages={resource.data.totalPages}
            total={resource.data.total}
            pageSize={20}
            rowCount={rows.length}
            disabled={resource.loading}
            onPageChange={page => update({ page })}
          />
        )}
      </section>
      {modal && (
        <CategoryDialog
          modal={modal}
          onClose={() => {
            setModal(null); refresh()
          }}
          onSaved={refresh}
          onPending={() => setPendingRevision(value => value + 1)}
        />
      )}
    </div>
  )
}

function CategoryTable({ rows, selected, resource, setSelection, toggle, setModal }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow>
            <TableHead>
              <Checkbox
                aria-label={t('categories.selectPage')}
                checked={selected.length === rows.length}
                onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? rows.map(row => row.id) : [] })}
              />
            </TableHead>
            {['code', 'name', 'sortOrder', 'status', 'dependencies', 'actions'].map(key => (
              <TableHead key={key}>
                {t(['code', 'name', 'sortOrder'].includes(key) ? `categories.fields.${key}` : `categories.${key}Label`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell>
                <Checkbox
                  aria-label={t('categories.select', { name: row.name })}
                  checked={selected.some(item => item.id === row.id)}
                  onCheckedChange={() => toggle(row.id)}
                />
              </TableCell>
              <TableCell className="font-semibold text-primary">
                <RecordLink
                  className="font-semibold"
                  onClick={() => setModal({ kind: 'detail', rows: [row] })}
                >
                  {row.code}
                </RecordLink>
              </TableCell>
              <TableCell className="min-w-48 font-semibold text-base">
                {row.name}
              </TableCell>
              <TableCell>
                {row.sortOrder}
              </TableCell>
              <TableCell>
                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${row.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  {t(row.isActive ? 'categories.active' : 'categories.inactive')}
                </span>
              </TableCell>
              <TableCell className="min-w-48 text-sm">
                {t('categories.dependencies', { services: row.serviceCount, proposals: row.pendingProposalCount })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={(
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-11 rounded-xl bg-muted/60"
                      aria-label={t('categories.rowActions', { name: row.name })}
                    />
                  )}
                  >
                    <MoreHorizontal size={20} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      ['detail', Eye, true], ['edit', Pencil, row.canEdit && !adminCategoryApi.pending().some(item => item.key === row.id)],
                      ['status', Power, row.canChangeStatus && !adminCategoryApi.pending().some(item => item.batch)],
                      ['delete', Trash2, row.canDelete && !adminCategoryApi.pending().some(item => item.batch)]
                    ].map(([kind, Icon, allowed]) => (
                      <DropdownMenuItem
                        key={kind}
                        disabled={!allowed}
                        onClick={() => setModal({ kind, rows: [row], isActive: !row.isActive })}
                        className={`text-base ${kind === 'delete' ? 'text-destructive' : ''}`}
                      >
                        <Icon size={17} />
                        {t(kind === 'status' ? row.isActive ? 'categories.lock' : 'categories.activate' : `categories.${kind}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
