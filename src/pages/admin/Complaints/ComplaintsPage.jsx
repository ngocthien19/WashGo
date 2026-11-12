import ClearFiltersButton from '~/components/ClearFiltersButton'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageSquareWarning, RefreshCw, MoreHorizontal, Eye, CheckCheck, X, Wallet, Clock, CircleCheck, FileX } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import TablePagination from '~/components/Pagination/TablePagination'
import StatCard from '~/components/workspace/StatCard'
import Reveal from '~/components/motion/Reveal'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ComplaintContact from './components/ComplaintContact'
import { customerContact, merchantContact } from './complaintContacts'
import IncidentStatusBadge from '~/pages/customer/Complaints/components/IncidentStatusBadge'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminComplaintApi } from '~/apis/admin/adminComplaintApi'
import { ADMIN_ROUTES, INCIDENT_TYPES, INCIDENT_SEVERITIES } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { readQuery, writeQuery, filter, statuses, severityClass, TAKE, canAct } from './complaintModel'
import ComplaintActionDialog from './components/ComplaintActionDialog'

const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
export default function ComplaintsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams(), [action, setAction] = useState(null)
  const query = useMemo(() => readQuery(params), [params])
  const load = useCallback(signal => adminComplaintApi.list(filter(query), signal), [query])
  const resource = useCatalogResource(load), summary = useCatalogResource(adminComplaintApi.summary), merchants = useCatalogResource(adminComplaintApi.merchants)
  const [resetVersion, setResetVersion] = useState(0)
  const update = patch => setParams(writeQuery({ ...query, ...patch, page: patch.page || 1 }))
  const refresh = () => {
    resource.retry(); summary.retry()
  }
  useEffect(() => {
    document.title = `${t('admin.nav.complaints')} | WashGo`
  }, [t])
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <MessageSquareWarning className="text-primary" />
            {t('admin.nav.complaints')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('admin.complaints.description')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={resource.loading || summary.loading}
          className="h-11 px-5 text-base"
        >
          <RefreshCw size={18} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      {!summary.data ? (
        <ResourceFeedback
          {...summary}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[['total', MessageSquareWarning], ['pending', Clock], ['resolved', CircleCheck], ['rejected', FileX]].map(([key, Icon], index) => (
            <StatCard
              key={key}
              label={t(`admin.complaints.summary.${key}`)}
              value={summary.data[index]}
              icon={Icon}
              className={['border-l-primary', 'border-l-amber-500', 'border-l-emerald-500', 'border-l-red-500'][index]}
              iconClassName={['bg-primary/10 text-primary', 'bg-amber-500/10 text-amber-700 dark:text-amber-300', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 'bg-red-500/10 text-red-700 dark:text-red-300'][index]}
            />
          ))}
        </div>
      )}
      <section className="workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2 sm:col-span-2">
          <p className="text-sm">
            {t('admin.complaints.search')}
          </p>
          <CatalogToolbar
            resetKey={resetVersion}
            embedded
            label={t('admin.complaints.search')}
            placeholder={t('admin.complaints.searchHint')}
            keyword={query.keyword}
            onSearch={keyword => update({ keyword })}
            formClassName="h-11 rounded-xl p-1 pl-3 [&_input]:h-8 [&_button]:size-8"
          />
        </div>
        <label className="grid gap-2 text-sm">
          {t('admin.sync.compensationFilter')}
          <SelectField
            label={t('admin.sync.compensationFilter')}
            value={query.compensationStatus}
            onValueChange={compensationStatus => update({ compensationStatus })}
            options={[{ value: '', label: t('common.all') }, ...[0, 1, 2].map(value => ({ value: String(value), label: t(`customer.incidents.compensationStatus.${value}`) }))]}
          />
        </label>
        {[['status', statuses, 'statuses'], ['severity', INCIDENT_SEVERITIES, 'severities'], ['type', INCIDENT_TYPES, 'types']].map(([key, values, labels]) => (
          <label
            key={key}
            className="grid gap-2 text-sm"
          >
            <span>
              {t(key === 'status' ? 'customer.incidents.statusLabel' : `customer.incidents.${key}`)}
            </span>
            <SelectField
              label={t(key === 'status' ? 'customer.incidents.statusLabel' : `customer.incidents.${key}`)}
              value={query[key]}
              onValueChange={value => update({ [key]: value })}
              options={[{ value: '', label: t('common.all') }, ...values.map(value => ({ value: String(value), label: t(key === 'status' ? `admin.complaints.statuses.${value}` : `customer.incidents.${labels}.${value}`) }))]}
            />
          </label>
        ))}
        <label className="grid gap-2 text-sm">
          <span>
            {t('admin.complaints.merchant')}
          </span>
          <SelectField
            label={t('admin.complaints.merchant')}
            value={query.merchantId}
            disabled={merchants.loading || Boolean(merchants.error)}
            onValueChange={merchantId => update({ merchantId })}
            options={[{ value: '', label: t('common.all') }, ...(merchants.data || []).map(merchant => ({ value: merchant.id, label: merchant.name })), ...(query.merchantId && !merchants.data?.some(item => item.id === query.merchantId) ? [{ value: query.merchantId, label: query.merchantId }] : [])]}
          />
        </label>
        {merchants.error && (
          <div className="sm:col-span-2 xl:col-span-4">
            <ResourceFeedback {...merchants} />
          </div>
        )}
        <ClearFiltersButton
          className="sm:col-span-2 xl:col-span-full"
          active={query.keyword || query.status || query.type || query.severity || query.merchantId || query.compensationStatus || query.orderId || query.customerId || query.from || query.to}
          onClear={() => {
            setResetVersion(value => value + 1); setParams({})
          }}
        />
        <DateRangeFilter
          key={`${resetVersion}:${query.from}:${query.to}`}
          from={query.from}
          to={query.to}
          onApply={update}
          label="admin.complaints.createdRange"
          className="space-y-3 border-t border-border pt-4 sm:col-span-2 xl:col-span-4"
        />
      </section>
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-busy={resource.loading}
      >
        <p className="border-b border-border p-5">
          <strong className="mr-2 text-2xl">
            {resource.loading || resource.error ? '—' : formatNumber(resource.data?.total)}
          </strong>
          {t('admin.complaints.results')}
        </p>
        {resource.loading || resource.error || !resource.data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
            empty="admin.complaints.empty"
          />
        ) : (
          <>
            <Table
              className="min-w-[1350px] text-base"
              aria-label={t('admin.nav.complaints')}
            >
              <TableHeader>
                <TableRow>
                  {['order', 'customer', 'merchant', 'type', 'severity', 'status', 'compensation', 'created', 'actions'].map(key => (
                    <TableHead
                      key={key}
                      className={`${headerBg} ${key === 'actions' ? 'sticky right-0 z-20 w-24 border-l border-border text-center' : ''}`}
                    >
                      {t(`admin.complaints.columns.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resource.data.list.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-48">
                      <Link
                        to={`${ADMIN_ROUTES.COMPLAINTS}/${row.id}`}
                        className="rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary hover:bg-primary/20"
                      >
                        {row.orderCode}
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-72">
                      <ComplaintContact value={customerContact(row)} />
                    </TableCell>
                    <TableCell className="min-w-80">
                      <ComplaintContact
                        kind="merchant"
                        value={merchantContact(row, merchants.data?.find(item => item.id === row.merchantId))}
                      />
                    </TableCell>
                    <TableCell className="min-w-40">
                      {t(`customer.incidents.types.${row.type}`)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${severityClass(row.severity)}`}>
                        {t(`customer.incidents.severities.${row.severity}`)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-44 whitespace-nowrap">
                      <IncidentStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="min-w-48">
                      <p className="font-semibold">
                        {formatCurrency(row.compensationAmount)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(`customer.incidents.compensationStatus.${row.compensationStatus}`)}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-48">
                      {formatDateTime(row.createdOn)}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                      <ComplaintMenu
                        row={row}
                        onAction={kind => setAction({ kind, id: row.id })}
                      />
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
      {action && (
        <ComplaintActionDialog
          key={`${action.id}:${action.kind}`}
          id={action.id}
          kind={action.kind}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null); refresh()
          }}
        />
      )}
    </Reveal>
  )
}

function ComplaintMenu({ row, onAction }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={(
        <Button
          size="icon"
          variant="secondary"
          className="size-10 rounded-xl"
          aria-label={t('admin.complaints.actionsFor', { code: row.orderCode })}
        />
      )}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link to={`${ADMIN_ROUTES.COMPLAINTS}/${row.id}`} />}>
          <Eye size={16} />
          {t('admin.complaints.detail')}
        </DropdownMenuItem>
        {canAct(row, 'resolve') && (
          <>
            <DropdownMenuItem onClick={() => onAction('resolve')}>
              <CheckCheck size={16} />
              {t('admin.complaints.resolve')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction('reject')}
              className="text-destructive"
            >
              <X size={16} />
              {t('admin.complaints.reject')}
            </DropdownMenuItem>
          </>
        )}
        {canAct(row, 'pay') && (
          <DropdownMenuItem onClick={() => onAction('pay')}>
            <Wallet size={16} />
            {t('admin.complaints.pay')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
