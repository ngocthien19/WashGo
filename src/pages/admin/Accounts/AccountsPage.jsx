import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { setUser } from '~/redux/auth/authSlice'
import { UsersRound, UserCheck, UserLock, Trash2, Plus, RefreshCw, MoreHorizontal, Eye, Pencil, Mail, LockKeyhole, LockKeyholeOpen, RotateCcw, ShieldCheck, Layers, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { SelectField } from '~/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import TablePagination from '~/components/Pagination/TablePagination'
import StatCard from '~/components/workspace/StatCard'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import RecordLink from '~/components/RecordLink'
import FormError from '~/components/ui/FormError'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminAccountApi, accountOperations } from '~/apis/admin/adminAccountApi'
import { formatDateTime } from '~/utils/format/formats'
import { notify } from '~/utils/notifications/notifications'
import { SEARCH_SUGGESTIONS } from '~/utils/config/constants'
import { ACCOUNT_ROLES, ACTION_CAPABILITIES, accountQuery, accountError } from './accountModel'
import { AccountShell, AccountStatus, AccountRole } from './AccountUI'
import AccountEditor from './AccountEditor'
import AccountDetails from './AccountDetails'
import AccountActionDialog from './AccountActionDialog'
import AccountEmailDialog from './AccountEmailDialog'

const accountSuggestionSource = async (filter, signal) => {
  const page = await adminAccountApi.list(filter, signal)
  return { list: page.items.map(item => ({ ...item, title: item.fullName, merchantName: item.partner?.businessName || item.partner?.shipperMerchantName })), totalPages: Math.ceil(page.total / page.take) }
}
const icons = { Edit: Pencil, ChangeEmail: Mail, Lock: LockKeyhole, Unlock: LockKeyholeOpen, SoftDelete: Trash2, Restore: RotateCcw, Permissions: ShieldCheck }
export default function AccountsPage() {
  const { t } = useTranslation()
  const { profile } = useOutletContext()
  const dispatch = useDispatch()
  const authUser = useSelector(state => state.auth.user)
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => accountQuery(params), [params])
  const resource = useCatalogResource(useCallback(signal => adminAccountApi.list(query, signal), [query]))
  const summary = useCatalogResource(adminAccountApi.summary)
  const callerId = profile?.data?.id
  const caller = useCatalogResource(useCallback(signal => callerId ? adminAccountApi.detail(callerId, signal) : Promise.resolve(null), [callerId]))
  const permissions = caller.data?.permissions || []
  const [selection, setSelection] = useState({ source: null, ids: [] })
  const [modal, setModal] = useState(null)
  const [batchResult, setBatchResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const pending = useSyncExternalStore(accountOperations.subscribe, accountOperations.snapshot)
  const rows = resource.data?.items || []
  const selected = selection.source === resource.data && !resource.loading && !resource.error ? selection.ids : []
  const canReadDeleted = summary.data?.deleted != null || permissions.includes('Accounts.ReadDeleted')
  const update = patch => {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(patch)) {
      if (value === '' || value === undefined) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    setSelection({ source: null, ids: [] }); setParams(next)
  }
  useEffect(() => {
    document.title = `${t('accounts.title')} | WashGo`
  }, [t])
  const refresh = () => {
    resource.retry(); summary.retry(); caller.retry(); setSelection({ source: null, ids: [] })
  }
  const saved = value => {
    if (value?.id === authUser?.id) {
      dispatch(setUser({ ...authUser, fullName: value.fullName, email: value.email, phone: value.phone, avatar: value.avatarUrl }))
      profile.retry()
    }
    if (value?.items) {
      setBatchResult(value); notify[value.totals.failed || value.totals.skipped ? 'warning' : 'success']('accounts.batchDone')
    } else {
      notify.success('accounts.saved')
      if ((value?.credentialDelivery ?? value?.partner?.credentialDelivery) === 2) {
        notify.warning('accounts.credentialFailed')
      }
    }
    setModal(null); refresh()
  }
  const toggle = id => setSelection({ source: resource.data, ids: selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id] })
  const check = async intent => {
    if (checking) {
      return
    }
    setChecking(true); setRecoveryError('')
    try {
      saved(await accountOperations.check(intent))
    } catch (failure) {
      setRecoveryError(accountError(failure))
      notify.error(accountError(failure))
    } finally {
      setChecking(false)
    }
  }
  return (
    <div className="mx-auto max-w-[1800px] space-y-6 [&_button:not([role=combobox])]:text-base [&_input]:text-[14px] [&_[role=combobox]]:text-[14px]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-[30px] font-bold">
            <UsersRound className="size-8 text-primary" />
            {t('accounts.title')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('accounts.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
            onClick={() => setModal({ action: 'Create' })}
            disabled={accountOperations.blocked(['new'])}
          >
            <Plus size={18} />
            {t('accounts.create')}
          </Button>
        </div>
      </header>
      {summary.loading || summary.error ? <ResourceFeedback {...summary} /> : (
        <div className={`grid gap-4 ${canReadDeleted ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {[['total', UsersRound, 'border-l-primary', 'bg-primary/10 text-primary'], ['active', UserCheck, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'], ['locked', UserLock, 'border-l-amber-500', 'bg-amber-500/10 text-amber-700 dark:text-amber-300'], ...(canReadDeleted ? [['deleted', Trash2, 'border-l-red-400', 'bg-red-500/10 text-red-700 dark:text-red-300']] : [])].map(([key, Icon, color, iconColor]) => (
            <StatCard
              key={key}
              icon={Icon}
              label={t(`accounts.stats.${key}`)}
              value={summary.data[key]}
              className={color}
              iconClassName={iconColor}
            />
          ))}
        </div>
      )}
      {pending.length > 0 && (
        <section
          className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"
          aria-live="polite"
        >
          <p className="font-semibold">
            {t('accounts.unknown')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('accounts.recoveryHint')}
          </p>
          <FormError>
            {recoveryError}
          </FormError>
          {pending.map(intent => (
            <Button
              key={intent.operationId}
              variant="outline"
              disabled={checking}
              onClick={() => check(intent)}
            >
              <RefreshCw size={16} />
              {t('accounts.checkOperation')}
              {' '}
              ·
              {t(intent.action === 'Create' ? 'accounts.create' : intent.action === 'Batch' ? 'accounts.bulk' : `accounts.actions.${intent.action}`)}
            </Button>
          ))}
        </section>
      )}
      <section className={`workspace-filters grid items-end gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 ${canReadDeleted ? 'xl:grid-cols-[1.4fr_1fr_1fr_1fr]' : 'xl:grid-cols-[1.4fr_1fr_1fr]'}`}>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-medium">
            {t('accounts.searchLabel')}
          </h2>
          <CatalogToolbar
            suggestionSource={accountSuggestionSource}
            suggestionFilter={{ ...query, take: SEARCH_SUGGESTIONS.PAGE_SIZE }}
            formClassName="h-11 py-0.5 [&_input]:h-9 [&_input]:text-[14px] [&_button]:size-8"
            embedded
            keyword={query.keyword}
            onSearch={keyword => update({ keyword })}
            label={t('accounts.searchLabel')}
            placeholder={t('accounts.searchPlaceholder')}
          />
        </div>
        <SelectField
          label={t('accounts.fields.role')}
          showLabel
          value={query.role || ''}
          onValueChange={role => update({ role })}
          options={[{ value: '', label: t('accounts.allRoles') }, ...ACCOUNT_ROLES.map(value => ({ value, label: t(`accounts.roles.${value}`) }))]}
        />
        <SelectField
          label={t('accounts.fields.status')}
          showLabel
          value={params.get('isActive') || ''}
          onValueChange={isActive => update({ isActive })}
          options={[{ value: '', label: t('accounts.allStatuses') }, { value: 'true', label: t('accounts.status.active') }, { value: 'false', label: t('accounts.status.locked') }]}
        />
        {canReadDeleted && (
          <SelectField
            label={t('accounts.deletedFilter')}
            showLabel
            value={query.deleted}
            onValueChange={deleted => update({ deleted, sortBy: undefined })}
            options={['Exclude', 'Include', 'Only'].map(value => ({ value, label: t(`accounts.deleted.${value}`) }))}
          />
        )}
        <DateRangeFilter
          key={`${params.get('from')}:${params.get('to')}`}
          from={params.get('from') || ''}
          to={params.get('to') || ''}
          onApply={update}
          label="accounts.createdRange"
          className="space-y-3 sm:col-span-2 xl:col-span-full"
        />
        <ClearFiltersButton
          className="sm:col-span-2 xl:col-span-full"
          active={params.size > 0}
          onClear={() => {
            setParams({}); setSelection({ source: null, ids: [] })
          }}
        />
      </section>
      {batchResult && (
        <BatchResult
          result={batchResult}
          onClose={() => setBatchResult(null)}
        />
      )}
      {selected.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-base font-semibold text-primary">
            {t('accounts.selected', { count: selected.length })}
          </p>
          <div className="flex gap-3">
            <Button
              className="h-11 px-5 text-base"
              disabled={accountOperations.blocked(selected)}
              onClick={() => setModal({ action: 'Batch', ids: selected })}
            >
              <Layers size={18} />
              {t('accounts.bulk')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('accounts.clearSelection')}
              onClick={() => setSelection({ source: null, ids: [] })}
            >
              <X size={18} />
            </Button>
          </div>
        </section>
      )}
      <section
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
        data-pagination-scope
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <h2 className="text-lg font-semibold">
            {t('accounts.results', { count: resource.data?.total || 0 })}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <SelectField
              label={t('accounts.sortLabel')}
              className="w-52 shrink-0"
              showLabel
              labelPosition="left"
              value={`${query.sortBy}:${query.sortDirection}`}
              onValueChange={value => {
                const [sortBy, sortDirection] = value.split(':'); update({ sortBy, sortDirection })
              }}
              options={['createdAt:desc', 'createdAt:asc', 'fullName:asc', 'fullName:desc', 'lastLoginAt:desc', ...(query.deleted !== 'Exclude' ? ['deletedAt:desc'] : [])].map(value => ({ value, label: t(`accounts.sort.${value.replace(':', '_')}`) }))}
            />
          </div>
        </div>
        {resource.loading || resource.error || !rows.length ? (
          <ResourceFeedback
            {...resource}
            empty="accounts.empty"
          />
        ) : (
          <Table className="min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    aria-label={t('accounts.selectPage')}
                    checked={selected.length === rows.length}
                    onCheckedChange={checked => setSelection({ source: resource.data, ids: checked ? rows.map(row => row.id) : [] })}
                  />
                </TableHead>
                {['account', 'contact', 'role', 'status', 'createdAt', 'lastLoginAt'].map(key => (
                  <TableHead
                    key={key}
                    className={key === 'role' ? 'min-w-40' : undefined}
                  >
                    {t(`accounts.fields.${key}`)}
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 min-w-24 bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] text-center dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))]">
                  {t('accounts.actionsLabel')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={t('accounts.selectAccount', { name: row.fullName })}
                      checked={selected.includes(row.id)}
                      onCheckedChange={() => toggle(row.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-52 items-center gap-3">
                      <UserAvatar
                        avatar={row.avatarUrl}
                        fullName={row.fullName}
                        className="size-11 shrink-0"
                      />
                      <div className="max-w-64">
                        <RecordLink
                          className="font-semibold"
                          onClick={() => setModal({ action: 'Details', id: row.id })}
                        >
                          {row.fullName}
                        </RecordLink>
                        {row.partner?.shipperMerchantName && (
                          <p className="mt-1 whitespace-normal text-sm text-muted-foreground">
                            {row.partner.shipperMerchantName}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <p>
                        {row.email}
                      </p>
                      <p className="text-muted-foreground">
                        {row.phone || '—'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AccountRole role={row.role} />
                  </TableCell>
                  <TableCell>
                    <AccountStatus account={row} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : t('accounts.neverLoggedIn')}
                  </TableCell>
                  <TableCell className="sticky right-0 min-w-24 bg-card text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={(
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('accounts.actionsFor', { name: row.fullName })}
                          className="size-10 rounded-xl bg-muted/70 text-foreground hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted"
                        />
                      )}
                      >
                        <MoreHorizontal size={20} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setModal({ action: 'Details', id: row.id })}>
                          <Eye size={16} />
                          {t('accounts.details')}
                        </DropdownMenuItem>
                        {Object.entries(ACTION_CAPABILITIES).filter(([, capability]) => row.capabilities[capability]).map(([action]) => {
                          const Icon = icons[action]
                          return (
                            <DropdownMenuItem
                              key={action}
                              disabled={accountOperations.blocked([row.id])}
                              className={action === 'SoftDelete' ? 'text-destructive' : ''}
                              onClick={() => setModal({ action, id: row.id })}
                            >
                              <Icon size={16} />
                              {t(`accounts.actions.${action}`)}
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {resource.data && (
          <TablePagination
            currentPage={resource.data.page}
            totalPages={Math.ceil(resource.data.total / resource.data.take)}
            total={resource.data.total}
            pageSize={resource.data.take}
            rowCount={rows.length}
            disabled={resource.loading}
            onPageChange={page => update({ page })}
          />
        )}
      </section>
      {modal && (
        <AccountModal
          key={`${modal.action}:${modal.id || ''}`}
          modal={modal}
          manageAdmins={permissions.includes('Accounts.ManageAdmins')}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </div>
  )
}

function AccountModal({ modal, manageAdmins, onClose, onSaved }) {
  const { t } = useTranslation()
  const [blockedOnOpen] = useState(() => modal.id && accountOperations.blocked([modal.id]))
  const resource = useCatalogResource(useCallback(signal => modal.id ? adminAccountApi.detail(modal.id, signal) : Promise.resolve(null), [modal.id]))
  if (modal.action === 'Create') {
    return (
      <AccountEditor
        manageAdmins={manageAdmins}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
  }
  if (modal.action === 'Batch') {
    return (
      <AccountActionDialog
        ids={modal.ids}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
  }
  if (resource.loading || resource.error) {
    return (
      <AccountShell
        title="accounts.details"
        onClose={onClose}
        footer={(
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        )}
      >
        <ResourceFeedback {...resource} />
      </AccountShell>
    )
  }
  const account = resource.data
  if (modal.action === 'Details') {
    return (
      <AccountDetails
        account={account}
        onClose={onClose}
      />
    )
  }
  if (blockedOnOpen || !account.capabilities[ACTION_CAPABILITIES[modal.action]]) {
    return (
      <AccountShell
        title={`accounts.actions.${modal.action}`}
        onClose={onClose}
        footer={(
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        )}
      >
        <FormError>accounts.actionUnavailable</FormError>
      </AccountShell>
    )
  }
  const props = { account, onClose, onSaved }
  if (modal.action === 'Edit') {
    return <AccountEditor {...props} />
  }
  if (modal.action === 'ChangeEmail') {
    return <AccountEmailDialog {...props} />
  }
  return (
    <AccountActionDialog
      {...props}
      action={modal.action}
    />
  )
}
function BatchResult({ result, onClose }) {
  const { t } = useTranslation()
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      aria-live="polite"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="text-lg font-semibold">
          {t('accounts.batchDone')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </header>
      <p className="p-4 text-sm text-muted-foreground">
        {t('accounts.batchSummary', result.totals)}
      </p>
      <ul className="divide-y divide-border">
        {result.items.map(item => (
          <li
            key={item.id}
            className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"
          >
            <span className="break-all">
              {item.fullName || item.id}
            </span>
            <span className={item.succeeded ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
              {t(`accounts.outcomes.${item.outcome}`)}
              {item.reasonCode ? ` · ${t(`accounts.errors.${item.reasonCode}`, { defaultValue: t('accounts.blocked') })}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
