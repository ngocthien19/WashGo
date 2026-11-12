import { adminFinanceApi } from '~/apis/admin/adminFinanceApi'
import { reconcileSchema } from '../financeModel'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { ClipboardCheck } from 'lucide-react'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import FinanceTable from './FinanceTable'
import ActionConfirmationDialog from '~/components/ActionConfirmationDialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import FormError from '~/components/ui/FormError'
import { newOperationId, adminOperation } from '~/apis/admin/adminWrite'
import { formatCurrency } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'

function ReconcileDialog({ row, onClose, onSaved }) {
  const { t } = useTranslation()
  const form = useForm({ resolver: yupResolver(reconcileSchema), defaultValues: { rate: row.appliedRate ?? '', evidence: '', confirmed: false } })
  const lock = useRef(false), operation = useRef(null)
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const submit = async (values, lookup = false) => {
    if (lock.current || blocked || unknown && !lookup) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    let sent = lookup
    try {
      let response
      if (lookup) {
        const value = await adminOperation('Finance', operation.current)
        if (value.state !== 'Completed' || value.action !== 'ReconcileCommission' || value.resourceId !== row.orderId) {
          throw new Error('admin.sync.processing')
        }
        response = { data: value.result }
      } else {
        operation.current = newOperationId(); sent = true
        response = await adminFinanceApi.reconcile(row.orderId, { rate: values.rate, evidence: values.evidence.trim(), expectedRate: row.appliedRate, expectedMissing: row.appliedRate === null, operationId: operation.current })
      }
      if (response.data?.succeeded !== true || response.data.data?.orderId !== row.orderId) {
        throw Object.assign(new Error('admin.invalidResponse'), { uncertain: true })
      }
      onSaved()
    } catch (failure) {
      const unresolved = sent && (lookup || failure.uncertain || !failure.response || failure.response.status >= 500)
      setUnknown(unresolved); if (failure.response?.status === 409) {
        setBlocked(true)
      }
      setError(unresolved ? 'admin.reviews.unknown' : getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <ActionConfirmationDialog
      title={t('admin.reconcile.title')}
      description={row.orderCode}
      icon={ClipboardCheck}
      pending={busy}
      disabled={blocked || row.inSettlement}
      error={error}
      onClose={() => {
        if (!unknown) {
          onClose()
        }
      }}
      onConfirm={() => {
        if (unknown) {
          submit(null, true)
        } else {
          form.handleSubmit(values => submit(values))()
        }
      }}
      confirmLabel={t(unknown ? 'admin.sync.checkResult' : 'common.confirm')}
    >
      <p className="rounded-xl bg-amber-500/10 p-4 text-sm">
        {t('admin.reconcile.hint')}
      </p>
      <fieldset
        disabled={busy || unknown || blocked}
        className="space-y-4"
      >
        <label className="grid gap-2">
          {t('admin.reconcile.rate')}
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            {...form.register('rate')}
            className="h-11 text-base"
          />
          <FormError>
            {form.formState.errors.rate?.message}
          </FormError>
        </label>
        <label className="grid gap-2">
          {t('admin.reconcile.evidence')}
          <textarea
            {...form.register('evidence')}
            maxLength={1000}
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-3 text-base"
          />
          <FormError>
            {form.formState.errors.evidence?.message}
          </FormError>
        </label>
        <label className="flex items-start gap-3">
          <Controller
            name="confirmed"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-1"
              />
            )}
          />
          {t('admin.reconcile.confirm')}
        </label>
        <FormError>
          {form.formState.errors.confirmed?.message}
        </FormError>
      </fieldset>
    </ActionConfirmationDialog>
  )
}

export default function CommissionReview({ merchantId }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1), [selected, setSelected] = useState(null), [revision, setRevision] = useState(0)
  const resource = useCatalogResource(useCallback(signal => adminFinanceApi.commissionReview({ page, take: 12, merchantId: merchantId || undefined }, signal), [page, merchantId]), revision)
  return (
    <section className="space-y-4">
      <p className="rounded-xl bg-amber-500/10 p-4 text-sm">
        {t('admin.reconcile.hint')}
      </p>
      {!resource.data ? <ResourceFeedback {...resource} /> : (
        <FinanceTable
          rows={resource.data.items}
          rowKey={row => row.orderId}
          label="admin.reconcile.title"
          pagination={{ page, total: resource.data.total, totalPages: Math.ceil(resource.data.total / 12), onChange: setPage }}
          columns={[
            { key: 'order', label: 'admin.reviews.order', render: row => (
              <Link
                className="font-semibold text-primary"
                to={`/admin/orders/${row.orderId}`}
              >
                {row.orderCode}
              </Link>
            ) },
            { key: 'merchant', label: 'admin.reviews.merchantName', render: row => row.merchantName || '—' },
            { key: 'rate', label: 'admin.reconcile.rate', render: row => row.appliedRate === null ? '—' : `${row.appliedRate}%` },
            { key: 'reason', label: 'admin.reviews.status', render: row => t(`admin.reconcile.${row.reason}`) },
            { key: 'collected', label: 'merchant.orderFinance.collectedLaundryAmount', render: row => formatCurrency(row.collectedLaundryAmount) },
            { key: 'actions', label: 'admin.reviews.actions', render: row => (
              <Button
                variant="outline"
                className="h-11 text-base"
                disabled={row.inSettlement}
                onClick={() => setSelected(row)}
              >
                <ClipboardCheck className="size-4" />
                {t(row.inSettlement ? 'admin.reconcile.locked' : 'admin.reconcile.title')}
              </Button>
            ) }
          ]}
        />
      )}
      {selected && (
        <ReconcileDialog
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null); setRevision(value => value + 1)
          }}
        />
      )}
    </section>
  )
}
