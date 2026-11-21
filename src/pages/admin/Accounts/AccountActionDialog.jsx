import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { LockKeyhole, LockKeyholeOpen, Trash2 } from 'lucide-react'
import FormError from '~/components/ui/FormError'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminAccountApi, accountOperations } from '~/apis/admin/adminAccountApi'
import { AccountShell, AccountField, AccountTabs } from './AccountUI'
import { ACCOUNT_PERMISSIONS, ACTION_CAPABILITIES, blockedReason } from './accountModel'
import useAccountCommand from './useAccountCommand'

export default function AccountActionDialog({ account, ids, action: initialAction, onClose, onSaved }) {
  const { t } = useTranslation()
  const bulk = Boolean(ids)
  const [action, setAction] = useState(initialAction || 'Lock')
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [forceConfirm, setForceConfirm] = useState(false)
  const [permissions, setPermissions] = useState(() => ACCOUNT_PERMISSIONS.filter(permission => account?.permissions?.includes(permission)))
  const [validation, setValidation] = useState('')
  const preview = useCatalogResource(useCallback(signal => bulk ? adminAccountApi.preview(action, ids, signal) : Promise.resolve(account), [bulk, action, ids, account]))
  const rows = preview.data?.items || []
  const eligible = rows.filter(row => row.canApply && row.found)
  const needsAuthentication = bulk ? rows.some(row => row.requiresReauthentication) : account.capabilities.requiresReauthentication
  const command = useAccountCommand({ requiresAuthentication: needsAuthentication, onSaved, onFailure: failure => {
    if (failure.response?.data?.meta?.code === 'ConfirmationRequired') {
      setForceConfirm(true)
    }
  } })
  const mustConfirm = action === 'Lock' && (forceConfirm || (bulk ? rows.some(row => row.requiresConfirmation) : account.obligations.openOrders > 0))
  const canApply = bulk ? eligible.length > 0 : account.capabilities[ACTION_CAPABILITIES[action]]
  const submit = event => {
    event.preventDefault()
    if ((action !== 'Unlock' && action !== 'Restore' && !reason.trim()) || reason.length > 500) {
      setValidation('accounts.validation.reason'); return
    }
    if (mustConfirm && !confirm) {
      setValidation('accounts.validation.confirm'); return
    }
    setValidation('')
    command.run(async () => {
      if (bulk) {
        // Reauthentication changes server capabilities; review the refreshed preview before sending.
        if (rows.some(row => row.reasonCodes.includes('ReauthenticationRequired'))) {
          preview.retry(); return
        }
        return accountOperations.send({ action: 'Batch', resourceId: 'batch', ids: rows.filter(row => row.found).map(row => row.id), suffix: '/bulk', labels: Object.fromEntries(rows.map(row => [row.id, { fullName: row.fullName, avatarUrl: row.avatarUrl }])), body: { action, items: rows.filter(row => row.found).map(row => ({ id: row.id, expectedRevision: row.revision })), reason: reason.trim(), confirm } })
      }
      const suffix = { Lock: 'status', Unlock: 'status', SoftDelete: 'soft-delete', Restore: 'restore', Permissions: 'permissions' }[action]
      return accountOperations.send({ action, resourceId: account.id, suffix: `/${account.id}/${suffix}`, method: action === 'Permissions' ? 'put' : 'post', body: {
        expectedRevision: account.revision, reason: reason.trim(),
        ...(['Lock', 'Unlock'].includes(action) ? { isActive: action === 'Unlock', confirm } : {}),
        ...(action === 'Permissions' ? { permissions } : {})
      } })
    })
  }
  const needsRefreshAuthentication = bulk && rows.some(row => row.reasonCodes.includes('ReauthenticationRequired'))
  return (
    <AccountShell
      title={bulk ? 'accounts.bulk' : `accounts.actions.${action}`}
      description={`accounts.descriptions.${bulk ? 'Bulk' : action}`}
      onClose={onClose}
      busy={command.pending}
      onSubmit={submit}
      tone={action === 'SoftDelete' ? 'danger' : action === 'Lock' ? 'warning' : 'info'}
      footer={(
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={command.pending}
          >
            {t('common.close')}
          </Button>
          <Button
            type="submit"
            variant={action === 'SoftDelete' ? 'destructive' : 'default'}
            disabled={command.pending || command.locked || preview.loading || Boolean(preview.error) || (!canApply && !needsRefreshAuthentication)}
          >
            {t(command.pending ? 'accounts.saving' : needsRefreshAuthentication ? 'accounts.authenticatePreview' : 'accounts.confirm')}
          </Button>
        </>
      )}
    >
      <FormError>
        {command.error || validation}
      </FormError>
      {bulk && (
        <AccountTabs
          value={action}
          onChange={value => {
            setAction(value); setConfirm(false); setForceConfirm(false); setValidation(''); command.setError('')
          }}
          label={t('accounts.chooseAction')}
          panelId="account-bulk-panel"
          disabled={command.pending || command.locked}
          items={[
            { value: 'Lock', label: t('accounts.actions.Lock'), icon: LockKeyhole },
            { value: 'Unlock', label: t('accounts.actions.Unlock'), icon: LockKeyholeOpen },
            { value: 'SoftDelete', label: t('accounts.actions.SoftDelete'), icon: Trash2 }
          ]}
        />
      )}
      <div
        id={bulk ? 'account-bulk-panel' : undefined}
        role={bulk ? 'tabpanel' : undefined}
        aria-label={bulk ? t(`accounts.actions.${action}`) : undefined}
      >
        {preview.loading || preview.error ? <ResourceFeedback {...preview} /> : bulk ? (
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('accounts.previewCount', { ready: eligible.length, total: rows.length })}
            </p>
            {rows.map(row => (
              <div
                key={row.id}
                className="flex items-start gap-3 rounded-xl border border-border p-3"
              >
                <UserAvatar
                  avatar={row.avatarUrl}
                  fullName={row.fullName || ''}
                  className="size-10 shrink-0"
                />
                <div className="min-w-0 text-sm">
                  <p className="break-words font-semibold">
                    {row.fullName || t('accounts.notFound')}
                  </p>
                  <p className={row.canApply ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    {t(row.alreadyInTargetState ? 'accounts.unchanged' : row.canApply ? 'accounts.ready' : 'accounts.blocked')}
                  </p>
                  {row.reasonCodes.map(code => (
                    <p
                      key={code}
                      className="mt-1 text-muted-foreground"
                    >
                      {t(`accounts.errors.${code}`, { defaultValue: t('accounts.blocked') })}
                    </p>
                  ))}
                  {row.openOrders > 0 && (
                    <p className="text-muted-foreground">
                      {t('accounts.openOrders', { count: row.openOrders })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-4">
            <UserAvatar
              avatar={account.avatarUrl}
              fullName={account.fullName}
              className="size-12 shrink-0"
            />
            <div className="min-w-0">
              <p className="break-words font-semibold">
                {account.fullName}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                {account.email}
              </p>
            </div>
          </div>
        )}
        {!bulk && !canApply && (
          <FormError>
            {`accounts.errors.${blockedReason(account, action) || 'PermissionRequired'}`}
          </FormError>
        )}
        {action === 'Permissions' && (
          <fieldset
            className="space-y-4 rounded-xl border border-border p-4"
            disabled={command.pending || command.locked}
          >
            <legend className="px-2 text-sm font-semibold">
              {t('accounts.permissionLegend')}
            </legend>
            {ACCOUNT_PERMISSIONS.map(permission => (
              <label
                key={permission}
                className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
              >
                <Checkbox
                  checked={permissions.includes(permission)}
                  onCheckedChange={checked => setPermissions(current => checked ? [...current, permission] : current.filter(value => value !== permission))}
                />
                {t(`accounts.permissions.${permission.split('.').at(-1)}`)}
              </label>
            ))}
          </fieldset>
        )}
      </div>
      <AccountField
        label="reason"
        required={!['Unlock', 'Restore'].includes(action)}
        error={validation ? { message: validation } : null}
      >
        <textarea
          aria-label={t('accounts.fields.reason')}
          value={reason}
          onChange={event => setReason(event.target.value)}
          maxLength={500}
          rows={3}
          disabled={command.pending || command.locked}
          className="w-full resize-y rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </AccountField>
      {mustConfirm && (
        <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed">
          <Checkbox
            aria-label={t('accounts.confirmOpenOrders')}
            checked={confirm}
            onCheckedChange={setConfirm}
            disabled={command.pending || command.locked}
          />
          {t('accounts.confirmOpenOrders')}
        </label>
      )}
      {command.authentication}
    </AccountShell>
  )
}
