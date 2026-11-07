import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Truck, Plus, RefreshCw, Eye, RotateCcw, Pencil, Trash2, LockKeyhole, LockKeyholeOpen, MoreHorizontal, Star, ClipboardPlus, X } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Checkbox } from '~/components/ui/checkbox'
import { notify } from '~/utils/notifications'
import ShipperAssignment from './components/ShipperAssignment'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import Pagination from '~/components/Pagination/Pagination'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Reveal from '~/components/motion/Reveal'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import { readShipperQuery, shipperFilter } from './shipperModel'
import ShipperDetails from './components/ShipperDetails'
import ShipperEditor from './components/ShipperEditor'
import ShipperSummary from './components/ShipperSummary'

export default function ShippersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readShipperQuery(params), [params])
  const load = useCallback((signal) => merchantShipperApi.list(shipperFilter(query), signal), [query])
  const resource = useCatalogResource(load)
  const loadSummary = useCallback((signal) => merchantShipperApi.summary(signal), [])
  const summary = useCatalogResource(loadSummary)
  const { data, loading, error } = resource
  const [selected, setSelected] = useState(null)
  const [editor, setEditor] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [selection, setSelection] = useState({ source: null, ids: [] })
  const ids = selection.source === data ? selection.ids : []
  const rows = data?.list || []
  const toggle = (id, checked) => setSelection({ source: data, ids: checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id) })
  const unavailable = () => notify.info('merchant.shippers.unavailable')
  useEffect(() => {
    document.title = `${t('merchant.nav.shippers')} | WashGo`
  }, [t])
  const update = (patch) => {
    const next = { ...query, ...patch, page: patch.page || 1 }
    setParams(Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1)).map(([key, value]) => [key, String(value)])))
  }
  const closeEditor = () => {
    setEditor(null); resource.retry(); summary.retry()
  }
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Truck className="text-primary" />
            {t('merchant.nav.shippers')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('merchant.shippers.description')}
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
            variant="outline-primary"
            onClick={() => setAssigning(true)}
            className="h-11 px-4 text-base"
          >
            <ClipboardPlus size={18} />
            {t('merchant.shippers.assign')}
          </Button>
          <Button
            onClick={() => setEditor({})}
            className="h-11 px-4 text-base"
          >
            <Plus size={18} />
            {t('merchant.shippers.add')}
          </Button>
        </div>
      </header>
      <ShipperSummary resource={summary} />
      <section className="grid items-end gap-4 rounded-2xl border border-border bg-card p-5 font-semibold shadow-sm [&_input]:font-semibold [&_input::placeholder]:font-semibold sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            {t('merchant.shippers.search')}
          </p>
          <CatalogToolbar
            embedded
            keyword={query.keyword}
            label={t('merchant.shippers.search')}
            placeholder={t('merchant.shippers.searchHint')}
            onSearch={(keyword) => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        {['status', 'isActive'].map((key) => (
          <div
            key={key}
            className="grid gap-2"
          >
            <label
              htmlFor={`filter-${key}`}
              className="text-sm text-muted-foreground"
            >
              {t(`merchant.shippers.${key === 'isActive' ? 'workState' : 'status'}`)}
            </label>
            <SelectField
              id={`filter-${key}`}
              label={t(`merchant.shippers.${key === 'isActive' ? 'workState' : 'status'}`)}
              value={query[key]}
              onValueChange={(value) => update({ [key]: value })}
              options={[{ value: '', label: t('common.all') }, ...(key === 'status' ? ['1', '2', '3'] : ['true', 'false']).map((value) => ({ value, label: t(`merchant.shippers.${key === 'status' ? 'statuses' : 'active'}.${value}`) }))]}
            />
          </div>
        ))}
      </section>
      {ids.length > 0 && (
        <div
          role="region"
          aria-label={t('merchant.shippers.bulkActions')}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4"
        >
          <p className="font-semibold text-primary">
            {t('merchant.shippers.selected', { count: ids.length })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              aria-disabled="true"
              onClick={unavailable}
              className="h-10 bg-amber-500/10 px-4 text-amber-700 dark:text-amber-300"
            >
              <LockKeyhole size={17} />
              {t('merchant.shippers.bulkLock')}
            </Button>
            <Button
              variant="destructive"
              aria-disabled="true"
              onClick={unavailable}
              className="h-10 px-4"
            >
              <Trash2 size={17} />
              {t('merchant.shippers.bulkDelete')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('merchant.shippers.clearSelection')}
              onClick={() => setSelection({ source: data, ids: [] })}
            >
              <X size={18} />
            </Button>
          </div>
          <p className="w-full text-sm text-muted-foreground">
            {t('merchant.shippers.unavailable')}
          </p>
        </div>
      )}
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-busy={loading}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <p className="text-base text-muted-foreground">
            {!loading && !error && data && (
              <strong className="mr-2 text-2xl text-foreground">
                <AnimatedNumber value={data.total} />
              </strong>
            )}
            {t('merchant.shippers.results')}
          </p>
          {(query.keyword || query.status || query.isActive) && (
            <Button
              variant="ghost"
              onClick={() => setParams({})}
              className="h-11 text-base"
            >
              <RotateCcw size={17} />
              {t('merchant.orders.clear')}
            </Button>
          )}
        </div>
        {loading || error || !data?.list.length ? (
          <ResourceFeedback
            loadingText="merchant.loading"
            {...resource}
            empty="merchant.shippers.empty"
          />
        ) : (
          <>
            <Table
              aria-label={t('merchant.nav.shippers')}
              className="min-w-[1050px] text-base"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label={t('merchant.shippers.selectPage')}
                      checked={rows.length > 0 && ids.length === rows.length}
                      indeterminate={ids.length > 0 && ids.length < rows.length}
                      onCheckedChange={(checked) => setSelection({ source: data, ids: checked ? rows.map((row) => row.id) : [] })}
                    />
                  </TableHead>
                  {['fullName', 'vehicleType', 'workState', 'status', 'activeTaskCount', 'totalDeliveries', 'rating', 'actions'].map((key) => (
                    <TableHead
                      key={key}
                      className={key === 'actions' ? 'sticky right-0 z-10 border-l border-border bg-card' : ''}
                    >
                      {t(`merchant.shippers.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map((shipper) => (
                  <TableRow
                    key={shipper.id}
                    className={ids.includes(shipper.id) ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={t('merchant.shippers.select', { name: shipper.fullName })}
                        checked={ids.includes(shipper.id)}
                        onCheckedChange={(checked) => toggle(shipper.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatar={shipper.avatar}
                          fullName={shipper.fullName}
                          className="size-11 text-sm"
                        />
                        <div>
                          <p className="font-bold">
                            {shipper.fullName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {shipper.phone || '—'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {shipper.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>
                        {t(`merchant.shippers.vehicles.${shipper.vehicleType}`, { defaultValue: '—' })}
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {shipper.vehiclePlate || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${shipper.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                        {t(`merchant.shippers.active.${shipper.isActive}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${shipper.status === 1 ? 'bg-primary/10 text-primary' : shipper.status === 2 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                        {t(`merchant.shippers.statuses.${shipper.status}`, { defaultValue: '—' })}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {shipper.activeTaskCount ?? '—'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {shipper.totalDeliveries ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-amber-600 dark:text-amber-300">
                      <Star
                        className="mr-1.5 inline-block size-4 fill-current align-[-2px]"
                        aria-hidden="true"
                      />
                      {shipper.rating ?? '—'}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            size="icon"
                            variant="secondary"
                            aria-label={t('merchant.shippers.actionsNamed', { name: shipper.fullName })}
                          />
                        )}
                        >
                          <MoreHorizontal size={20} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                          <DropdownMenuItem
                            aria-label={t('merchant.shippers.view', { name: shipper.fullName })}
                            onClick={() => setSelected(shipper.id)}
                          >
                            <Eye
                              size={17}
                              className="text-primary"
                            />
                            {t('merchant.shippers.details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            aria-label={t('merchant.shippers.editNamed', { name: shipper.fullName })}
                            onClick={() => {
                              setSelected(null); setEditor({ loadingId: shipper.id })
                            }}
                          >
                            <Pencil
                              size={17}
                              className="text-primary"
                            />
                            {t('merchant.shippers.edit')}
                          </DropdownMenuItem>
                          <div className="my-1 border-t border-border" />
                          <DropdownMenuItem
                            disabled
                            aria-label={t('merchant.shippers.unlockNamed', { name: shipper.fullName })}
                            className="text-emerald-700 data-disabled:opacity-100 dark:text-emerald-300"
                          >
                            <LockKeyholeOpen size={17} />
                            {t('merchant.shippers.unlock')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled
                            aria-label={t('merchant.shippers.lockNamed', { name: shipper.fullName })}
                            className="text-amber-700 data-disabled:opacity-100 dark:text-amber-300"
                          >
                            <LockKeyhole size={17} />
                            {t('merchant.shippers.lock')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled
                            aria-label={t('merchant.shippers.deleteNamed', { name: shipper.fullName })}
                            className="text-destructive data-disabled:opacity-100"
                          >
                            <Trash2 size={17} />
                            {t('merchant.shippers.delete')}
                          </DropdownMenuItem>
                          <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                            {t('merchant.shippers.unavailable')}
                          </p>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border p-5">
              <Pagination
                currentPage={query.page}
                totalPages={data.totalPages}
                onPageChange={(page) => update({ page })}
              />
            </div>
          </>
        )}
      </section>
      {selected && (
        <ShipperDetails
          id={selected}
          onClose={() => setSelected(null)}
          onEdit={(shipper) => {
            setSelected(null); setEditor(shipper)
          }}
        />
      )}
      {assigning && <ShipperAssignment onClose={() => setAssigning(false)} />}
      {editor?.loadingId && (
        <ShipperDetails
          id={editor.loadingId}
          editImmediately
          onClose={closeEditor}
          onEdit={(shipper) => setEditor(shipper)}
        />
      )}
      {editor && !editor.loadingId && (
        <ShipperEditor
          shipper={editor.id ? editor : null}
          onClose={closeEditor}
          onSaved={closeEditor}
        />
      )}
    </Reveal>
  )
}
