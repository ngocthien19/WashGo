import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, RefreshCw, MoreHorizontal, Eye, History, MapPin, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import Reveal from '~/components/motion/Reveal'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantLockerApi } from '~/apis/merchant/merchantLockerApi'
import { formatLockerAddress } from '~/utils/formats'
import { LOCKER_TAKE, readLockerQuery, lockerFilter, lockerSortOptions, lockerStateClass } from './lockerModel'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import LockerSummary from './components/LockerSummary'
import LockerDialog from './components/LockerDialog'

export default function LockersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => readLockerQuery(params), [params])
  const load = useCallback((signal) => merchantLockerApi.list(lockerFilter(query), signal), [query])
  const loadSummary = useCallback((signal) => merchantLockerApi.summary(signal), [])
  const resource = useCatalogResource(load)
  const summary = useCatalogResource(loadSummary)
  const { data, error, loading } = resource
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    document.title = `${t('merchant.nav.lockers')} | WashGo`
  }, [t])
  const update = (patch) => {
    const next = { ...query, ...patch, page: patch.page || 1 }
    setParams(Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1) && !(key === 'sort' && value === 'code')).map(([key, value]) => [key, String(value)])))
  }
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <PanelsTopLeft className="text-primary" />
            {t('merchant.nav.lockers')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('merchant.lockers.description')}
          </p>
        </div>
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
      </header>
      <LockerSummary resource={summary} />
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 font-semibold shadow-sm [&_input]:font-semibold [&_input::placeholder]:font-semibold sm:grid-cols-[2fr_1fr]">
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            {t('merchant.lockers.search')}
          </p>
          <CatalogToolbar
            embedded
            keyword={query.keyword}
            label={t('merchant.lockers.search')}
            placeholder={t('merchant.lockers.searchHint')}
            onSearch={(keyword) => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="locker-status"
            className="text-sm text-muted-foreground"
          >
            {t('merchant.lockers.status')}
          </label>
          <SelectField
            id="locker-status"
            label={t('merchant.lockers.status')}
            value={query.status}
            onValueChange={(status) => update({ status })}
            options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map((value) => ({ value: String(value), label: t(`merchant.lockers.statuses.${value}`) }))]}
          />
        </div>
      </section>
      <section
        data-pagination-scope
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
            {(query.keyword || query.status) && (
              <Button
                variant="ghost"
                onClick={() => update({ keyword: '', status: '' })}
                className="h-11 text-base"
              >
                <RotateCcw size={17} />
                {t('merchant.orders.clear')}
              </Button>
            )}
            <SelectField
              label={t('customer.orders.sort')}
              value={query.sort}
              onValueChange={(sort) => update({ sort })}
              className="workspace-filters w-44 font-medium"
              options={Object.keys(lockerSortOptions).map((value) => ({ value, label: t(`merchant.lockers.sort.${value}`) }))}
            />
          </div>
        </div>
        {loading || error || !data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
            empty="merchant.lockers.empty"
          />
        ) : (
          <>
            <Table
              aria-label={t('merchant.nav.lockers')}
              className="min-w-[850px] text-base"
            >
              <TableHeader>
                <TableRow>
                  {['name', 'address', 'type', 'totalBoxes', 'emptyBoxes', 'status', 'actions'].map((key) => (
                    <TableHead key={key}>
                      {t(`merchant.lockers.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map((locker) => (
                  <TableRow key={locker.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ResourceThumbnail
                          urls={locker.imageUrls}
                          name={locker.name}
                          icon={PanelsTopLeft}
                        />
                        <div className="min-w-0">
                          <p className="font-bold">
                            {locker.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {locker.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <p className="flex items-start gap-2">
                        <MapPin
                          size={16}
                          className="mt-1 shrink-0 text-primary"
                        />
                        <span>
                          {formatLockerAddress(locker)}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell>
                      {t(`merchant.lockers.types.${locker.lockerType}`, { defaultValue: '—' })}
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(
                          <Button
                            size="icon"
                            variant="secondary"
                            aria-label={t('merchant.lockers.actionsNamed', { name: locker.name })}
                          />
                        )}
                        >
                          <MoreHorizontal size={20} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setSelected({ id: locker.id, tab: 'details' })}>
                            <Eye
                              size={17}
                              className="text-primary"
                            />
                            {t('merchant.lockers.details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelected({ id: locker.id, tab: 'history' })}>
                            <History
                              size={17}
                              className="text-emerald-600"
                            />
                            {t('merchant.lockers.history')}
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
              totalPages={data.totalPages}
              onPageChange={(page) => update({ page })}
              total={data.total}
              pageSize={LOCKER_TAKE}
              rowCount={data.list.length}
            />
          </>
        )}
      </section>
      {selected && (
        <LockerDialog
          key={selected.id}
          id={selected.id}
          initialTab={selected.tab}
          onClose={() => setSelected(null)}
        />
      )}
    </Reveal>
  )
}
