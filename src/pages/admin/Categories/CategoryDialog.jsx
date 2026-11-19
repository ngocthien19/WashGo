import { Checkbox } from '~/components/ui/checkbox'
import { FolderTree, Plus, Pencil, Power, Trash2, Layers, LockKeyhole, LockKeyholeOpen, CircleCheck, Info, AlignLeft, ListOrdered, Shirt, ClipboardList } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminCategoryApi } from '~/apis/admin/adminCategoryApi'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'
import FormError from '~/components/ui/FormError'
import { categoryDefaults, categorySchema, categoryReasonSchema } from './categoryModel'

export default function CategoryDialog({ modal, onClose, onSaved, onPending }) {
  const { t } = useTranslation()
  const lockRef = useRef(false)
  const statusActive = modal.intent?.body.isActive ?? modal.isActive
  const Icon = modal.kind === 'bulk' ? Layers : modal.kind === 'create' ? Plus : modal.kind === 'edit' ? Pencil : modal.kind === 'delete' ? Trash2 : modal.kind === 'status' ? statusActive ? LockKeyholeOpen : LockKeyhole : FolderTree
  const resource = useCatalogResource(useCallback(signal => modal.intent ? Promise.resolve(modal.intent.rows) : Promise.all((modal.rows || []).map(row => adminCategoryApi.detail(row.id, signal))), [modal]))
  return (
    <Dialog
      open
      onOpenChange={open => !open && !lockRef.current && onClose()}
    >
      <DialogContent
        className="flex max-w-2xl flex-col overflow-clip p-0 sm:p-0 [&_button]:text-base"
        closeLabel="common.close"
      >
        <DialogHeader
          tone={modal.kind === 'delete' ? 'danger' : modal.kind === 'status' ? statusActive ? 'success' : 'warning' : modal.kind === 'bulk' ? 'warning' : 'info'}
          className="m-0 shrink-0 border-b border-border bg-gradient-to-br from-primary/8 to-card p-6 sm:m-0"
        >
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <Icon size={24} />
            {t(modal.kind === 'status' ? statusActive ? 'categories.activateTitle' : 'categories.lockTitle' : `categories.${modal.kind}`)}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-6 text-muted-foreground">
            {t(modal.kind === 'bulk' ? 'categories.selected' : ['detail', 'status', 'delete'].includes(modal.kind) ? `categories.modalDescriptions.${modal.kind}` : 'categories.description', { count: (modal.rows || modal.intent?.rows || []).length })}
          </DialogDescription>
        </DialogHeader>
        {resource.loading || resource.error ? (
          <div className="p-6">
            <ResourceFeedback {...resource} />
          </div>
        ) : (
          <CategoryDialogBody
            modal={modal}
            rows={resource.data || []}
            lockRef={lockRef}
            onClose={onClose}
            onSaved={onSaved}
            onPending={onPending}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategoryDialogBody({ modal, rows, lockRef, onClose, onSaved, onPending }) {
  const { t } = useTranslation()
  const row = rows[0]
  const editing = ['create', 'edit'].includes(modal.kind), detail = modal.kind === 'detail'
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false)
  const [intent, setIntent] = useState(modal.intent || null), [result, setResult] = useState(null)
  const [action, setAction] = useState(modal.intent?.action === 'delete' ? 'delete' : (modal.intent?.body.isActive ?? modal.isActive) ? 'activate' : 'pause')
  const deleting = modal.kind === 'delete' || modal.kind === 'bulk' && action === 'delete'
  const targetActive = modal.kind === 'bulk' ? action === 'activate' : modal.isActive
  const [confirmed, setConfirmed] = useState(false)
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(editing ? categorySchema : categoryReasonSchema), defaultValues: modal.intent?.batch === false ? { ...modal.intent.body } : categoryDefaults(row) })
  const permission = detail || modal.kind === 'create' || rows.every(item => modal.kind === 'edit' ? item.canEdit === true : deleting ? item.canDelete === true || item.deleteReasonCode === 'CategoryInUse' : item.canChangeStatus === true)
  const run = async (values, recovery) => {
    if (lockRef.current || blocked && !recovery || !recovery && !editing && !confirmed) {
      return
    }
    lockRef.current = true; setBusy(true); setError('')
    try {
      let response
      if (recovery) {
        response = await adminCategoryApi[recovery](intent.key)
      } else {
        if (!permission) {
          throw new Error('categories.notAllowed')
        }
        const latest = editing ? await Promise.all(rows.map(item => adminCategoryApi.detail(item.id))) : rows
        if (latest.some((item, index) => item.version !== rows[index].version)) {
          setBlocked(true); throw new Error('categories.changed')
        }
        const batch = !editing
        const next = { key: batch ? 'batch' : row?.id || 'new', kind: modal.kind, rows, batch, id: row?.id,
          action: deleting ? 'delete' : 'status',
          body: batch ? { operationId: crypto.randomUUID(), items: rows.map(item => ({ id: item.id, expectedVersion: item.version })), isActive: deleting ? false : targetActive, reason: values.reason?.trim() || '' }
            : { ...values, expectedVersion: row?.version, operationId: crypto.randomUUID() } }
        setIntent(next)
        response = await adminCategoryApi.execute(next)
      }
      if (response.state === 'Processing') {
        setResult(response); setError('categories.unknown'); onPending(); return
      }
      setResult(response); setIntent(null); onSaved()
      const failed = response.items?.filter(item => !item.succeeded).length || 0
      if (failed) {
        notify.error('categories.partialResult', { succeeded: response.items.length - failed, failed })
      } else {
        notify.success(`categories.success.${editing ? row ? 'edit' : 'create' : deleting ? 'delete' : targetActive ? 'activate' : 'lock'}`)
        onClose()
      }
    } catch (failure) {
      const unknown = adminCategoryApi.pending().some(item => item.key === (editing ? row?.id || 'new' : 'batch'))
      if (!unknown && failure.response?.status === 409) {
        setBlocked(true)
      }
      if (!unknown) {
        setIntent(null)
      }
      setError(unknown ? 'categories.unknown' : getApiError(failure)); onPending()
    } finally {
      lockRef.current = false; setBusy(false)
    }
  }
  const pending = !!intent && adminCategoryApi.pending().some(item => item.key === intent.key)
  const finished = result?.state === 'Completed'
  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-clip"
      noValidate
      onSubmit={event => {
        handleSubmit(values => run(values))(event)
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        {editing ? (
          <fieldset
            className="grid gap-4 sm:grid-cols-2"
            disabled={busy || pending || blocked}
          >
            {['code', 'name', 'sortOrder', 'description', 'reason'].map(key => (
              <label
                key={key}
                className={`grid gap-2 ${['description', 'reason'].includes(key) ? 'sm:col-span-2' : ''} ${key === 'code' ? 'cursor-default select-none' : ''}`}
              >
                <span className="text-sm font-medium">
                  {t(`categories.fields.${key}`)}
                  {['name', 'sortOrder'].includes(key) && (
                    <span
                      aria-hidden="true"
                      className="ml-1 text-destructive"
                    >
                      *
                    </span>
                  )}
                </span>
                <Input
                  {...register(key)}
                  aria-label={t(`categories.fields.${key}`)}
                  placeholder={t(key === 'code' ? 'common.systemGeneratedCode' : `categories.placeholders.${key}`)}
                  aria-required={['name', 'sortOrder'].includes(key)}
                  disabled={key === 'code'}
                  tabIndex={key === 'code' ? -1 : undefined}
                  type={key === 'sortOrder' ? 'number' : 'text'}
                  maxLength={key === 'code' ? 30 : key === 'name' ? 100 : 500}
                  className="h-11 text-base md:text-base"
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `category-${key}-error` : undefined}
                />
                <FormError
                  inline
                  id={`category-${key}-error`}
                >
                  {errors[key]?.message}
                </FormError>
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3 text-base font-medium">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy || pending || blocked}
                  />
                )}
              />
              {t('categories.active')}
            </label>
          </fieldset>
        ) : (
          <>
            {modal.kind === 'bulk' && (
              <div
                role="tablist"
                aria-label={t('categories.bulk')}
                className="flex flex-wrap border-b border-border"
              >
                {['pause', 'activate', 'delete'].map(key => (
                  <Button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={action === key}
                    variant="ghost"
                    disabled={busy || pending || finished || blocked}
                    onClick={() => {
                      setAction(key); setConfirmed(false); setError('')
                    }}
                    className={`h-12 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 text-base font-medium hover:bg-transparent dark:hover:bg-transparent ${action === key ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
                  >
                    {key === 'delete' ? <Trash2 size={18} /> : <Power size={18} />}
                    {t(`categories.bulkActions.${key}`)}
                  </Button>
                ))}
              </div>
            )}
            <ul className="space-y-3">
              {rows.map(item => (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 bg-primary/[0.04] p-5 sm:flex">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <FolderTree size={28} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium text-primary">
                        {item.code}
                      </p>
                      <h3 className="mt-1 break-words text-xl font-bold leading-7">
                        {item.name}
                      </h3>
                    </div>
                    <span className={`col-span-2 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium sm:ml-auto ${item.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'badge-inactive'}`}>
                      {item.isActive ? <CircleCheck size={16} /> : <LockKeyhole size={16} />}
                      {t(item.isActive ? 'categories.active' : 'categories.inactive')}
                    </span>
                  </div>
                  {detail ? (
                    <div className="space-y-5 border-t border-border p-5">
                      <dl className="grid gap-3 sm:grid-cols-3">
                        {[
                          ['sortOrder', ListOrdered, item.sortOrder],
                          ['services', Shirt, item.serviceCount],
                          ['proposals', ClipboardList, item.pendingProposalCount]
                        ].map(([key, Icon, value]) => (
                          <div
                            key={key}
                            className="rounded-xl border border-border bg-muted/20 p-4"
                          >
                            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Icon
                                size={16}
                                className="shrink-0 text-primary"
                              />
                              {t(key === 'sortOrder' ? 'categories.fields.sortOrder' : `categories.${key}Label`)}
                            </dt>
                            <dd className="mt-2 text-xl font-semibold tabular-nums">
                              {value ?? '—'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <section className="rounded-xl border border-border p-4">
                        <h4 className="flex items-center gap-2 text-sm font-medium">
                          <AlignLeft
                            size={17}
                            className="text-primary"
                          />
                          {t('categories.fields.description')}
                        </h4>
                        <p className={`mt-3 whitespace-pre-wrap break-words text-base leading-7 ${item.description?.trim() ? '' : 'text-muted-foreground'}`}>
                          {item.description?.trim() || t('categories.noDescription')}
                        </p>
                      </section>
                    </div>
                  ) : (
                    <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
                      {t('categories.dependencies', { services: item.serviceCount, proposals: item.pendingProposalCount })}
                    </p>
                  )}
                  {deleting && item.deleteReasonCode === 'CategoryInUse' && (
                    <p className="border-t border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm leading-6 text-amber-800 dark:text-amber-300">
                      {t('categories.inUse')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {!detail && (
              <div className={`flex items-start gap-3 rounded-xl border p-4 ${deleting ? 'border-destructive/20 bg-destructive/5' : targetActive ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <Info
                  size={20}
                  className={`mt-0.5 shrink-0 ${deleting ? 'text-destructive' : targetActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}
                />
                <div>
                  <h3 className="text-base font-semibold">
                    {t('categories.impactTitle')}
                  </h3>
                  <p className="mt-1 text-base leading-7 text-muted-foreground">
                    {t(deleting ? 'categories.deleteHint' : targetActive ? 'categories.activateHint' : 'categories.lockHint')}
                  </p>
                </div>
              </div>
            )}
            {!detail && (
              <>
                {modal.kind === 'bulk' && (
                  <p className="text-base font-medium">
                    {t('categories.bulkCount', { count: rows.length })}
                  </p>
                )}
                <label className="grid gap-2">
                  <span className="text-sm font-medium">
                    {t('categories.fields.reason')}
                  </span>
                  <Input
                    aria-label={t('categories.fields.reason')}
                    {...register('reason')}
                    placeholder={t('categories.placeholders.reason')}
                    className="h-11 text-base md:text-base"
                    maxLength={500}
                    disabled={busy || pending || finished}
                    aria-invalid={!!errors.reason}
                    aria-describedby={errors.reason ? 'category-reason-error' : undefined}
                  />
                  <FormError
                    inline
                    id="category-reason-error"
                  >
                    {errors.reason?.message}
                  </FormError>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-base leading-6">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={setConfirmed}
                    disabled={busy || pending || finished}
                  />
                  {t('categories.confirm')}
                </label>
              </>
            )}
          </>
        )}
        {!permission && (
          <p className="text-sm text-destructive">
            {t('categories.notAllowed')}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
          >
            {t(error)}
          </p>
        )}
        {result?.items && (
          <section
            aria-label={t('categories.results')}
            className="space-y-3"
          >
            <h3 className="font-bold">
              {t('categories.results')}
            </h3>
            {result.items.map(item => (
              <div
                key={item.id}
                className="rounded-xl border border-border p-3 text-sm"
              >
                <strong>
                  {rows.find(row => row.id === item.id)?.name || item.id}
                </strong>
                <p className={item.succeeded ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                  {t(`admin.sync.outcomes.${item.outcome}`, { defaultValue: item.outcome })}
                  {' '}
                  ·
                  {' '}
                  {item.message || item.reasonCode}
                </p>
                {item.dependencyCounts && (
                  <p>
                    {t('categories.dependencies', { services: item.dependencyCounts.services ?? 0, proposals: item.dependencyCounts.pendingProposals ?? 0 })}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border bg-card p-5">
        <Button
          type="button"
          variant="secondary"
          className="h-11 px-5 text-base"
          disabled={busy}
          onClick={onClose}
        >
          {t('common.close')}
        </Button>
        {pending ? (
          <>
            <Button
              type="button"
              className="h-11 text-base"
              disabled={busy}
              onClick={() => run(null, 'check')}
            >
              {t('admin.sync.checkResult')}
            </Button>
            <Button
              type="button"
              className="h-11 text-base"
              disabled={busy}
              onClick={() => run(null, 'resume')}
            >
              {t('categories.resume')}
            </Button>
          </>
        )
          : !detail && !finished && (
            <Button
              type="submit"
              variant={deleting ? 'destructive' : 'default'}
              className="h-11 px-5 text-base"
              disabled={busy || blocked || !permission || !editing && !confirmed}
            >
              {t(editing ? 'categories.save' : 'categories.apply')}
            </Button>
          )}
      </footer>
    </form>
  )
}
