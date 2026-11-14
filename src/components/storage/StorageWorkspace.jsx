import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Warehouse, RefreshCw, ListFilter } from 'lucide-react'
import { storageApi } from '~/apis/storage/storageApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import { SelectField } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { ADMIN_ROUTES, MERCHANT_ROUTES } from '~/utils/config/constants'
import { dateRangeFilter } from '~/utils/format/dateRange'
import { loadSuggestionPages } from '~/utils/search/searchSuggestions'
import StorageCycleCard from './StorageCycleCard'
import StorageActionDialog from './StorageActionDialog'

export default function StorageWorkspace({ role }) {
  const { t } = useTranslation()
  const stateId = useId()
  const [query, setQuery] = useState({ keyword: '', state: '', from: '', to: '', page: 1 })
  const [revision, setRevision] = useState(0), [action, setAction] = useState(null)
  const filter = { keyword: query.keyword || undefined, state: query.state ? Number(query.state) : undefined, ...dateRangeFilter(query), page: query.page, take: 12 }
  const key = JSON.stringify(filter)
  const loadSuggestions = useCallback(async (keyword, signal) => {
    const rows = await loadSuggestionPages(storageApi.filter, JSON.parse(key), keyword.slice(0, 100), signal)
    return rows.map(row => ({ id: row.orderId, label: row.orderCode, fields: [row.orderCode, t(`storage.states.${row.state}`)] }))
  }, [key, t])
  const resource = useCatalogResource(useCallback(signal => storageApi.filter(JSON.parse(key), signal), [key]), revision)
  const summary = useCatalogResource(useCallback(signal => storageApi.summary(signal), []), revision)
  const update = values => setQuery(current => ({ ...current, ...values, page: 1 }))
  const refresh = () => setRevision(value => value + 1)
  const done = () => {
    setAction(null); refresh()
  }
  const routes = role === 'Admin' ? ADMIN_ROUTES : MERCHANT_ROUTES
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Warehouse className="text-primary" />
          {t('storage.title')}
        </h1>
        <Button
          variant="outline"
          className="h-11"
          onClick={refresh}
        >
          <RefreshCw />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      {summary.loading || summary.error ? <ResourceFeedback {...summary} /> : (
        <dl className="grid gap-3 sm:grid-cols-4">
          {Object.entries(summary.data || {}).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-border bg-card p-4"
            >
              <dt className="text-sm text-muted-foreground">
                {t(`storage.orderStates.${status}`)}
              </dt>
              <dd className="mt-2 text-2xl font-bold text-primary">
                {count}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <section className="workspace-filters min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <ListFilter
            size={18}
            className="text-primary"
          />
          {t('storage.filters')}
        </h2>
        <div className="grid min-w-0 items-end gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-2">
            <p
              className="text-sm text-muted-foreground"
              aria-hidden="true"
            >
              {t('storage.searchLabel')}
            </p>
            <CatalogToolbar
              loadSuggestions={loadSuggestions}
              embedded
              keyword={query.keyword}
              onSearch={keyword => update({ keyword: keyword.slice(0, 100) })}
              label={t('storage.searchLabel')}
              placeholder={t('storage.search')}
              formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <label
              htmlFor={stateId}
              className="text-sm text-muted-foreground"
            >
              {t('storage.state')}
            </label>
            <SelectField
              id={stateId}
              label={t('storage.state')}
              value={query.state}
              options={[{ value: '', label: t('common.all') }, ...[1, 2, 3, 4, 5, 6].map(value => ({ value: String(value), label: t(`storage.states.${value}`) }))]}
              onValueChange={state => update({ state })}
            />
          </div>
        </div>
        <DateRangeFilter
          key={`${query.from}:${query.to}`}
          from={query.from}
          to={query.to}
          onApply={update}
        />
        <ClearFiltersButton
          active={query.keyword || query.state || query.from || query.to}
          onClear={() => setQuery({ keyword: '', state: '', from: '', to: '', page: 1 })}
        />
      </section>
      <section
        data-pagination-scope
        className="space-y-4"
      >
        {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : (
          <>
            {!resource.data.list.length && <ResourceFeedback empty="storage.empty" />}
            {resource.data.list.map(row => (
              <div
                key={row.orderId}
                className="space-y-3 rounded-2xl border border-border bg-card p-5"
              >
                <Link
                  className="text-lg font-bold text-primary hover:underline"
                  to={`${routes.ORDERS}/${row.orderId}`}
                >
                  {row.orderCode}
                </Link>
                <StorageCycleCard
                  row={row}
                  role={role}
                  disabled={storageApi.hasPending(row.orderId)}
                  onAction={name => setAction({ name, row })}
                />
                {storageApi.hasPending(row.orderId) && (
                  <Button
                    variant="outline"
                    onClick={() => setAction({ name: 'exception', row })}
                  >
                    {t('admin.sync.checkResult')}
                  </Button>
                )}
              </div>
            ))}
          </>
        )}
        <Pagination
          currentPage={query.page}
          totalPages={resource.data?.totalPages || 0}
          disabled={resource.loading}
          onPageChange={page => setQuery(current => ({ ...current, page }))}
        />
      </section>
      {action && (
        <StorageActionDialog
          order={{ id: action.row.orderId, revision: action.row.orderRevision }}
          cycle={action.row}
          role={role}
          action={action.name}
          onClose={done}
          onSaved={done}
        />
      )}
    </div>
  )
}
