import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, ShieldCheck, Mail, Phone, KeyRound, CalendarDays, History, Clock, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '~/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminAccountApi } from '~/apis/admin/adminAccountApi'
import { formatDateTime } from '~/utils/format/formats'
import { ADMIN_ROUTES } from '~/utils/config/constants'
import { AccountShell, AccountStatus, AccountTabs } from './AccountUI'
import { ACCOUNT_PERMISSIONS, OBLIGATIONS } from './accountModel'

const fieldIcons = { email: Mail, phone: Phone, signInMethod: KeyRound, createdAt: CalendarDays, updatedAt: History, lastLoginAt: Clock, businessName: Store }
const obligationColors = [
  'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  'bg-lime-500/10 text-lime-800 dark:text-lime-300',
  'bg-teal-500/10 text-teal-700 dark:text-teal-300'
]
export default function AccountDetails({ account, onClose }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('profile')
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
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-muted/25 p-5">
        <UserAvatar
          avatar={account.avatarUrl}
          fullName={account.fullName}
          className="size-16"
        />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-xl font-bold">
            {account.fullName}
          </h3>
          <p className="mt-1 text-sm text-primary">
            {t(`accounts.roles.${account.role}`)}
          </p>
        </div>
        <AccountStatus account={account} />
      </div>
      <AccountTabs
        value={tab}
        onChange={setTab}
        label={t('accounts.details')}
        idPrefix="account"
        panelId="account-panel"
        items={['profile', 'activities'].map(value => ({ value, label: t(`accounts.${value}`) }))}
      />
      <section
        id="account-panel"
        role="tabpanel"
        aria-labelledby={`account-${tab}-tab`}
      >
        {tab === 'activities' ? <Activities accountId={account.id} /> : (
          <div className="space-y-5">
            <dl className="grid gap-5 rounded-2xl border border-border p-5 sm:grid-cols-2">
              {[
                ['email', account.email], ['phone', account.phone], ['signInMethod', t(`accounts.methods.${account.signInMethod}`)],
                ['createdAt', formatDateTime(account.createdAt)], ['updatedAt', formatDateTime(account.updatedAt)], ['lastLoginAt', account.lastLoginAt ? formatDateTime(account.lastLoginAt) : t('accounts.neverLoggedIn')],
                ['businessName', account.partner?.businessName || account.partner?.shipperMerchantName]
              ].filter(([, value]) => value != null && value !== '').map(([key, value]) => {
                const Icon = fieldIcons[key]
                return (
                  <div
                    key={key}
                    className="min-w-0"
                  >
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon
                        size={17}
                        className="shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {t(`accounts.fields.${key}`)}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-medium">
                      {value || '—'}
                    </dd>
                  </div>
                )
              })}
            </dl>
            {account.isProtected && (
              <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-4 text-sm">
                <ShieldCheck size={18} />
                {t('accounts.protected')}
              </p>
            )}
            {account.statusChangedAt && (
              <HistoryBox
                title={t('accounts.statusChanged')}
                date={account.statusChangedAt}
                actor={account.statusChangedBy?.fullName}
                reason={account.statusReason}
              />
            )}
            {account.deletedAt && (
              <HistoryBox
                title={t('accounts.deletedInfo')}
                date={account.deletedAt}
                actor={account.deletedBy?.fullName}
                reason={account.deleteReason}
              />
            )}
            {account.role === 'Admin' && Array.isArray(account.permissions) && (
              <section className="space-y-3 rounded-2xl border border-border p-5">
                <h3 className="font-semibold">
                  {t('accounts.actions.Permissions')}
                </h3>
                {ACCOUNT_PERMISSIONS.filter(permission => account.permissions.includes(permission)).map(permission => (
                  <p
                    key={permission}
                    className="text-sm text-primary"
                  >
                    {t(`accounts.permissions.${permission.split('.').at(-1)}`)}
                  </p>
                ))}
                {!account.permissions.length && (
                  <p className="text-sm text-muted-foreground">
                    {t('accounts.noExtraPermissions')}
                  </p>
                )}
              </section>
            )}
            <section className="space-y-4 rounded-2xl border border-border p-5">
              <h3 className="font-semibold">
                {t('accounts.obligationsTitle')}
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                {OBLIGATIONS.map((key, index) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"
                  >
                    <dt>
                      {t(`accounts.obligations.${key}`)}
                    </dt>
                    <dd className={`inline-flex min-w-9 justify-center rounded-lg px-2.5 py-1 text-base font-semibold tabular-nums ${obligationColors[index]}`}>
                      {account.obligations[key] ?? '—'}
                    </dd>
                  </div>
                ))}
              </dl>
              {account.obligations.items?.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('accounts.relatedOrders')}
                  </p>
                  {account.obligations.items.map((item, index) => (
                    <Link
                      key={`${item.orderId}-${index}`}
                      className="flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                      to={`${ADMIN_ROUTES.ORDERS}/${item.orderId}`}
                    >
                      {item.orderCode}
                      <ExternalLink size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </AccountShell>
  )
}
function HistoryBox({ title, date, actor, reason }) {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-sm">
      <h3 className="font-semibold">
        {title}
      </h3>
      <p className="text-muted-foreground">
        {formatDateTime(date)}
        {actor ? ` · ${actor}` : ''}
      </p>
      {reason && (
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {reason}
        </p>
      )}
    </section>
  )
}
function Activities({ accountId }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const resource = useCatalogResource(useCallback(signal => adminAccountApi.activities(accountId, page, signal), [accountId, page]))
  if (resource.loading || resource.error || !resource.data?.list.length) {
    return (
      <ResourceFeedback
        {...resource}
        empty="accounts.noActivities"
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <Table
        aria-label={t('accounts.activities')}
        className="min-w-[660px]"
      >
        <TableHeader>
          <TableRow>
            {['time', 'actor', 'action', 'result', 'reason'].map(key => (
              <TableHead key={key}>
                {t(`accounts.activityFields.${key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resource.data.list.map((item, index) => {
            const result = ({ 1: 'Success', 2: 'Failed', 3: 'Denied' })[item.result] || item.result
            const color = ['Success', 'Succeeded'].includes(result) ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : result === 'Failed' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            return (
              <TableRow key={item.id || index}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  <time>
                    {formatDateTime(item.occurredAt)}
                  </time>
                </TableCell>
                <TableCell className="min-w-32 text-sm font-semibold">
                  {item.actorName || t('accounts.system')}
                </TableCell>
                <TableCell className="min-w-28 text-sm font-medium text-primary">
                  {t(`accounts.audit.${item.action}`, { defaultValue: item.action })}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium ${color}`}>
                    {result ? t(`accounts.audit.${result}`, { defaultValue: String(result) }) : '?'}
                  </span>
                </TableCell>
                <TableCell className="min-w-44 max-w-xs whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {item.reason?.trim() || '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <TablePagination
        currentPage={page}
        totalPages={Math.ceil(resource.data.total / 10)}
        total={resource.data.total}
        pageSize={10}
        rowCount={resource.data.list.length}
        onPageChange={setPage}
      />
    </div>
  )
}
