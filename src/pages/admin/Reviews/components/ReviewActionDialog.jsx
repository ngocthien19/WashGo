import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Eye, EyeOff, Layers, CircleCheck } from 'lucide-react'
import ActionConfirmationDialog from '~/components/ActionConfirmationDialog'
import DetailTabs from '~/components/DetailTabs'
import FormError from '~/components/ui/FormError'
import { Checkbox } from '~/components/ui/checkbox'
import { ReviewScore, ReviewStatus } from './ReviewDisplay'
import { adminReviewApi } from '~/apis/admin/adminReviewApi'
import { newOperationId } from '~/apis/admin/adminWrite'
import { canModerate, reviewActionSchema } from '../reviewModel'
import { getApiError } from '~/utils/apiError'

export default function ReviewActionDialog({ rows, bulk = false, initialOperation, onClose, onSaved, onUnknown, onResolved }) {
  const { t } = useTranslation()
  const [hidden, setHidden] = useState(initialOperation ? initialOperation.action === 'Hide' : !rows[0].isHidden)
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(!!initialOperation), [error, setError] = useState(''), [result, setResult] = useState(null), [blocked, setBlocked] = useState(false)
  const [frozen, setFrozen] = useState(!!initialOperation)
  const lock = useRef(false), submitted = useRef(initialOperation || null)
  const form = useForm({ resolver: yupResolver(reviewActionSchema(hidden)), defaultValues: { reason: '', confirmed: false } })
  const eligible = rows.filter(row => canModerate(row, hidden))
  const execute = async (values, lookup = false) => {
    if (lock.current || result || blocked || unknown && !lookup) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    let sent = lookup
    try {
      let response
      if (lookup) {
        response = await adminReviewApi.lookup(submitted.current, bulk)
      } else {
        if (!eligible.length || rows.length > 50) {
          throw new Error('admin.reviews.notReady')
        }
        if (!bulk) {
          const fresh = await adminReviewApi.detail(rows[0].id)
          if (fresh.version !== rows[0].version || !canModerate(fresh, hidden)) {
            setBlocked(true); throw new Error('admin.reviews.stale')
          }
        }
        const command = { operationId: newOperationId(), action: hidden ? 'Hide' : 'Show', reason: values.reason.trim() || null, items: eligible.map(row => ({ id: row.id, expectedVersion: row.version })) }
        submitted.current = command; setFrozen(true); sent = true
        response = bulk ? await adminReviewApi.batch(command) : await adminReviewApi.visibility(eligible[0], hidden, command.reason, command.operationId)
      }
      setResult(bulk ? response.items : [{ id: response.id, succeeded: true, outcome: 'Changed' }]); setUnknown(false); onResolved(); onSaved()
    } catch (failure) {
      const uncertain = sent && (lookup || failure.uncertain || !failure.response || failure.response.status >= 500 || failure.response.status === 408)
      if (uncertain) {
        setUnknown(true); onUnknown({ rows, bulk, initialOperation: submitted.current }); setError('admin.reviews.unknown')
      } else if ([404, 405, 501].includes(failure.response?.status)) {
        setBlocked(true); setError('admin.reviews.notReady')
      } else {
        if (failure.response?.status === 409) {
          setBlocked(true)
        }
        setError(getApiError(failure))
      }
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <ActionConfirmationDialog
      title={t(bulk ? 'admin.reviews.bulk' : hidden ? 'admin.reviews.hide' : 'admin.reviews.show')}
      description={t('admin.reviews.actionHint', { count: rows.length })}
      icon={bulk ? Layers : hidden ? EyeOff : Eye}
      tone={hidden ? 'danger' : 'info'}
      pending={busy}
      disabled={!!result || blocked || !unknown && (!eligible.length || rows.length > 50)}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        if (unknown) {
          execute(null, true)
        } else {
          form.handleSubmit(values => execute(values))()
        }
      }}
      confirmLabel={t(result ? 'admin.reviews.done' : unknown ? 'admin.sync.checkResult' : hidden ? 'admin.reviews.hide' : 'admin.reviews.show')}
    >
      {bulk && !frozen && (
        <DetailTabs
          label={t('admin.reviews.bulk')}
          value={hidden ? 'Hide' : 'Show'}
          onChange={value => {
            if (!busy) {
              setHidden(value === 'Hide'); form.reset({ reason: '', confirmed: false }); setError('')
            }
          }}
          tabs={[{ value: 'Hide', label: t('admin.reviews.hide') }, { value: 'Show', label: t('admin.reviews.show') }]}
        />
      )}
      <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border px-4">
        {rows.map(row => {
          const outcome = result?.find(item => item.id === row.id)
          return (
            <li
              key={row.id}
              className="space-y-2 py-3"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <strong>
                  {row.orderCode}
                </strong>
                <ReviewScore value={row.overallStars} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ReviewStatus hidden={outcome?.succeeded && !['Skipped', 'Failed'].includes(outcome.outcome) ? hidden : row.isHidden} />
                {outcome ? (
                  <span className={outcome.succeeded ? 'text-sm text-emerald-700 dark:text-emerald-300' : 'text-sm text-destructive'}>
                    {t(`admin.reviews.outcomes.${outcome.outcome && ['Changed', 'Unchanged', 'Skipped', 'Failed'].includes(outcome.outcome) ? outcome.outcome : outcome.succeeded ? 'Succeeded' : 'Failed'}`)}
                    {outcome.message && (
                      <span className="ml-2">
                        {outcome.message}
                      </span>
                    )}
                  </span>
                ) : !canModerate(row, hidden) && (
                  <span className="text-sm text-muted-foreground">
                    {t('admin.reviews.skipped')}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {result ? (
        <p className="flex items-center gap-2 font-medium">
          <CircleCheck className="size-5 text-emerald-600" />
          {t('admin.reviews.resultsHint')}
        </p>
      ) : unknown ? (
        <p className="text-sm text-muted-foreground">
          {t('admin.reviews.lookupHint')}
        </p>
      ) : (
        <>
          {!eligible.length && (
            <p className="rounded-xl bg-amber-500/10 p-4 text-sm">
              {t('admin.reviews.notReady')}
            </p>
          )}
          {hidden && (
            <label className="grid gap-2 text-base font-medium">
              {t('admin.reviews.reason')}
              <textarea
                aria-label={t('admin.reviews.reason')}
                aria-invalid={!!form.formState.errors.reason}
                {...form.register('reason')}
                maxLength={500}
                disabled={busy || blocked}
                className="min-h-28 w-full rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder={t('admin.reviews.reasonHint')}
              />
              <FormError>
                {form.formState.errors.reason?.message}
              </FormError>
            </label>
          )}
          <label className="flex items-start gap-3 text-base">
            <Controller
              name="confirmed"
              control={form.control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={busy || blocked}
                  className="mt-1"
                />
              )}
            />
            {t('admin.reviews.confirm')}
          </label>
          <FormError>
            {form.formState.errors.confirmed?.message}
          </FormError>
        </>
      )}
    </ActionConfirmationDialog>
  )
}
