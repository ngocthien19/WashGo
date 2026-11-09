import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wallet, Undo2, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminFinanceApi } from '~/apis/admin/adminFinanceApi'
import { ADMIN_ROUTES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { actionSchema, actionAllowed, settlementSnapshot, refundSnapshot, unknownWrite, statusClass } from '../financeModel'
import FinanceBreakdown from './FinanceBreakdown'

export default function FinanceRecordDialog({ kind, value: original, period, onClose, onSaved }) {
  const { t } = useTranslation()
  const commission = kind === 'commissionDetail', refund = ['refundDetail', 'approve', 'reject', 'confirmRefund'].includes(kind), detail = kind.endsWith('Detail')
  const load = useCallback(signal => commission ? adminFinanceApi.commissions({ ...period, merchantId: original.merchantId }, signal).then(rows => {
    const row = rows.find(item => item.merchantId === original.merchantId); if (!row) {
      throw new Error('admin.finance.notFound')
    } return row
  }) : refund ? adminFinanceApi.refund(original.id, signal) : adminFinanceApi.settlement(original, signal), [commission, refund, original, period])
  const resource = useCatalogResource(load), value = resource.data
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(actionSchema(kind)), defaultValues: { text: '' } })
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [confirmed, setConfirmed] = useState(false), [error, setError] = useState('')
  const locked = useRef(false)
  const submit = async values => {
    if (!value || locked.current || blocked || !confirmed || !actionAllowed(kind, value)) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const latest = await load(), compare = refund ? refundSnapshot : settlementSnapshot
      if (compare(latest) !== compare(value) || !actionAllowed(kind, latest)) {
        setBlocked(true); throw new Error('admin.finance.changed')
      }
      writing = true
      if (kind === 'pay') {
        await adminFinanceApi.pay(value.id, values.text.trim())
      } else if (kind === 'confirmRefund') {
        await adminFinanceApi.confirmRefund(value.id, values.text.trim())
      } else {
        await adminFinanceApi.review(value.id, kind === 'approve', values.text.trim() || null)
      }
      notify.success(`admin.finance.success.${kind}`); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.finance.unknown' : getApiError(failure); setError(message); notify.error(message)
    } finally {
      locked.current = false; setPending(false)
    }
  }
  const title = detail ? 'admin.finance.detail' : `admin.finance.${kind}`
  const reference = ['pay', 'confirmRefund'].includes(kind), Icon = kind === 'reject' ? X : refund ? Undo2 : Wallet
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !locked.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        ready={!resource.loading}
        className="max-w-2xl"
        closeLabel="common.close"
      >
        <DialogHeader tone={kind === 'reject' ? 'danger' : detail ? 'info' : 'success'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Icon />
            {t(title)}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t(detail ? commission ? 'admin.finance.commissionHint' : refund ? 'admin.finance.refundHint' : 'admin.finance.settlementHint' : reference ? 'admin.finance.manualHint' : kind === 'reject' ? 'admin.finance.rejectHint' : 'admin.finance.reviewHint')}
          </DialogDescription>
        </DialogHeader>
        {!value ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <div className="mt-5 space-y-5">
            {refund ? (
              <section className="space-y-4 rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to={`${ADMIN_ROUTES.ORDERS}/${value.orderId}`}
                    className="font-semibold text-primary"
                  >
                    {value.orderCode || original.orderCode || t('customer.incidents.relatedOrder')}
                  </Link>
                  <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(value.status)}`}>
                    {t(`admin.finance.refundStatuses.${value.status}`)}
                  </span>
                </div>
                <p className="font-semibold">
                  {value.customerName || original.customerName || '—'}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(value.amount)}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {value.reason}
                </p>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  {[['reviewNote', value.reviewNote || '—'], ['refundReference', value.refundReference || '—'], ['reviewedAt', formatDateTime(value.reviewedAt)], ['refundedAt', formatDateTime(value.refundedAt)]].map(([key, text]) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">
                        {t(`admin.finance.${key}`)}
                      </dt>
                      <dd className="mt-2 whitespace-pre-wrap break-words font-medium">
                        {text}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : (
              <>
                <p className="text-xl font-semibold">
                  {value.merchantName}
                </p>
                {!commission && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(value.periodFrom, 'Asia/Ho_Chi_Minh')}
                      {' '}
                      →
                      {' '}
                      {formatDateTime(value.periodTo, 'Asia/Ho_Chi_Minh')}
                    </p>
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(value.status)}`}>
                      {t(`admin.finance.settlementStatuses.${value.status}`)}
                    </span>
                  </>
                )}
                <FinanceBreakdown
                  value={value}
                  settlement={!commission}
                />
                {kind === 'pay' && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                    {t('admin.finance.commissionHint')}
                  </p>
                )}
                {!commission && (
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">
                        {t('admin.finance.reference')}
                      </dt>
                      <dd className="mt-2 break-words font-semibold">
                        {value.paymentReference || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('admin.finance.paidAt')}
                      </dt>
                      <dd className="mt-2 font-semibold">
                        {formatDateTime(value.paidAt)}
                      </dd>
                    </div>
                  </dl>
                )}
              </>
            )}
            {!detail && (
              <form
                noValidate
                onSubmit={event => handleSubmit(submit)(event)}
                className="space-y-5"
              >
                {!actionAllowed(kind, value) && (
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t('admin.finance.unavailable')}
                  </p>
                )}
                <fieldset
                  disabled={pending || blocked || !actionAllowed(kind, value)}
                  className="space-y-4"
                >
                  <label className="grid gap-3 text-sm font-medium">
                    <span>
                      {t(reference ? 'admin.finance.reference' : 'admin.finance.reviewNote')}
                    </span>
                    {reference ? (
                      <Input
                        {...register('text')}
                        maxLength={120}
                        aria-label={t('admin.finance.reference')}
                        placeholder={t('admin.finance.referenceHint')}
                        className="h-11 rounded-xl text-base font-normal"
                      />
                    ) : (
                      <textarea
                        {...register('text')}
                        aria-label={t('admin.finance.reviewNote')}
                        maxLength={1000}
                        placeholder={t('admin.finance.noteHint')}
                        className="min-h-24 rounded-xl border border-input bg-background p-3 text-base font-normal"
                      />
                    )}
                    {errors.text && (
                      <span
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {t('admin.finance.invalidField')}
                      </span>
                    )}
                  </label>
                  <label className="flex items-start gap-3 text-base">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={setConfirmed}
                      className="mt-1"
                    />
                    {t(reference ? 'admin.finance.confirmTransferred' : 'admin.finance.confirmReview')}
                  </label>
                </fieldset>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {t(error)}
                  </p>
                )}
                <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={pending}
                    className="h-11 px-5 text-base"
                  >
                    {t('common.close')}
                  </Button>
                  <Button
                    type="submit"
                    variant={kind === 'reject' ? 'destructive' : 'default'}
                    disabled={pending || blocked || !confirmed || !actionAllowed(kind, value)}
                    className="h-11 px-5 text-base"
                  >
                    <Check size={18} />
                    {t('admin.finance.confirm')}
                  </Button>
                </footer>
              </form>
            )}
          </div>
        )}
        {detail && (
          <footer className="mt-5 flex justify-end border-t border-border pt-5">
            <Button
              variant="secondary"
              onClick={onClose}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  )
}
