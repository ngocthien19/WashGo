import { cloneElement, isValidElement, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { UsersRound } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import { accountStatus } from './accountModel'

const roleColors = {
  Customer: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Merchant: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Shipper: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Admin: 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
}
export function AccountRole({ role }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-sm font-medium ${roleColors[role] || 'bg-muted text-foreground'}`}>
      {t(`accounts.roles.${role}`)}
    </span>
  )
}

export function AccountStatus({ account }) {
  const { t } = useTranslation()
  const status = accountStatus(account)
  const color = status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : status === 'deleted' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${color}`}>
      {t(`accounts.status.${status}`)}
    </span>
  )
}
export function AccountShell({ title, description = 'accounts.dialogDescription', tone = 'info', onClose, busy, children, footer, onSubmit }) {
  const { t } = useTranslation()
  const Tag = onSubmit ? 'form' : 'div'
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !busy) {
          onClose()
        }
      }}
    >
      <DialogContent
        data-dialog-fixed
        closeLabel="common.close"
        className="max-w-3xl"
        showClose={!busy}
      >
        <Tag
          data-dialog-layout
          onSubmit={onSubmit}
          noValidate={onSubmit ? true : undefined}
        >
          <DialogHeader tone={tone}>
            <DialogTitle className="flex items-center gap-3 pr-4 text-2xl font-bold">
              <UsersRound />
              {t(title)}
            </DialogTitle>
            <DialogDescription className="mt-3 text-base leading-relaxed text-muted-foreground">
              {t(description)}
            </DialogDescription>
          </DialogHeader>
          <div
            data-dialog-body
            className="text-base [&_input]:text-[16px] [&_textarea]:text-[16px] [&_[role=combobox]]:text-[16px]"
          >
            {children}
          </div>
          <footer
            data-dialog-footer
            className="flex flex-wrap justify-end gap-3 [&_button]:h-11 [&_button]:min-w-24 [&_button]:px-5 [&_button]:text-base"
          >
            {footer}
          </footer>
        </Tag>
      </DialogContent>
    </Dialog>
  )
}
export function AccountField({ label, error, required, children, ...props }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={id}
        className="block text-base font-semibold"
      >
        {t(`accounts.fields.${label}`)}
        {required && (
          <span
            aria-hidden="true"
            className="ml-1 text-destructive"
          >
            *
          </span>
        )}
      </label>
      {isValidElement(children) ? cloneElement(children, { id, placeholder: children.props.placeholder || t(`accounts.placeholders.${label}`, { defaultValue: t('accounts.placeholders.generic', { field: t(`accounts.fields.${label}`) }) }), 'aria-required': Boolean(required), 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined }) : children || (
        <Input
          id={id}
          {...props}
          placeholder={props.placeholder || t(`accounts.placeholders.${label}`, { defaultValue: t('accounts.placeholders.generic', { field: t(`accounts.fields.${label}`) }) })}
          aria-required={Boolean(required)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 text-[16px]"
        />
      )}
      <FormError
        inline
        id={`${id}-error`}
      >
        {error?.message}
      </FormError>
    </div>
  )
}

export function AccountTabs({ value, onChange, items, label, disabled = false, panelId, idPrefix }) {
  const generated = useId()
  const prefix = idPrefix || generated
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-border"
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          id={`${prefix}-${item.value}-tab`}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          aria-controls={panelId}
          tabIndex={value === item.value ? 0 : -1}
          disabled={disabled}
          className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-base font-medium outline-none transition-colors delay-0 duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 ${value === item.value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
          onClick={() => onChange(item.value)}
          onKeyDown={event => {
            if (disabled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
              return
            }
            event.preventDefault()
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
            onChange(items[next].value)
            event.currentTarget.parentElement.querySelectorAll('[role=tab]')[next]?.focus()
          }}
        >
          {item.icon && <item.icon size={18} />}
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function AccountAuthentication({ password, setPassword, error, disabled }) {
  const { t } = useTranslation()
  return (
    <section className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6 dark:border-red-400/30 dark:bg-red-500/10 [&_input]:border-red-200 [&_input]:bg-card [&_input]:shadow-sm [&_input]:enabled:hover:border-primary/60 [&_input]:focus-visible:border-primary [&_input]:focus-visible:ring-primary/20 dark:[&_input]:border-red-400/30">
      <p className="text-sm leading-relaxed text-red-900/80 dark:text-red-200">
        {t('accounts.reauthenticate')}
      </p>
      <AccountField
        label="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={event => setPassword(event.target.value)}
        error={error ? { message: error } : null}
        disabled={disabled}
        required
      />
    </section>
  )
}
