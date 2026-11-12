import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, ArrowLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import { SelectField } from '~/components/ui/select'
import { adminFinanceApi } from '~/apis/admin/adminFinanceApi'
import { vietnamToday, shiftDay } from '~/utils/dateRange'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { createSchema, periodFilter, unknownWrite } from '../financeModel'
import FinanceBreakdown from './FinanceBreakdown'

export default function SettlementEditor({ merchants, defaultMerchant, onClose, onSaved }) {
  const { t } = useTranslation()
  const yesterday = shiftDay(vietnamToday(), -1)
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(createSchema), defaultValues: { merchantId: defaultMerchant || '', from: shiftDay(yesterday, -29), to: yesterday } })
  const [preview, setPreview] = useState(null), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [confirmed, setConfirmed] = useState(false), [error, setError] = useState('')
  const locked = useRef(false)
  const submit = async values => {
    if (locked.current || blocked) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const query = periodFilter(values)
      const quote = await adminFinanceApi.quote(query)
      const row = quote.summary
      if (!row) {
        throw new Error('admin.finance.noPreview')
      }
      if (!preview) {
        setPreview({ row, quote, values: { ...values }, query }); setConfirmed(false); return
      }
      if (!confirmed) {
        return
      }
      if (quote.quoteToken !== preview.quote.quoteToken || !quote.canCreate || JSON.stringify(query) !== JSON.stringify(preview.query)) {
        setBlocked(true); throw new Error('admin.finance.changed')
      }
      writing = true
      await adminFinanceApi.create({ ...query, quoteToken: preview.quote.quoteToken })
      notify.success('admin.finance.created'); onSaved()
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
        className="max-w-2xl"
        closeLabel="common.close"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <ClipboardCheck className="text-primary" />
            {t('admin.finance.create')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t('admin.finance.createHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={event => handleSubmit(submit)(event)}
          className="mt-5 space-y-5"
        >
          <fieldset
            disabled={pending || blocked || Boolean(preview)}
            className="workspace-filters grid gap-4 sm:grid-cols-2"
          >
            <label className="grid gap-3 text-base font-medium sm:col-span-2">
              <span>
                {t('admin.complaints.merchant')}
              </span>
              <Controller
                name="merchantId"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label={t('admin.complaints.merchant')}
                    className="h-12 text-base font-normal"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[{ value: '', label: t('admin.finance.chooseMerchant') }, ...merchants.map(row => ({ value: row.id, label: row.name }))]}
                  />
                )}
              />
              {errors.merchantId && (
                <span
                  role="alert"
                  className="text-destructive"
                >
                  {t('admin.finance.chooseMerchant')}
                </span>
              )}
            </label>
            {['from', 'to'].map(key => (
              <label
                key={key}
                className="grid gap-3 text-base font-medium"
              >
                <span>
                  {t(`merchant.orders.${key}Day`)}
                </span>
                <Input
                  {...register(key)}
                  type="date"
                  aria-label={t(`merchant.orders.${key}Day`)}
                  min="1970-01-02"
                  max={yesterday}
                  className="h-11 rounded-xl text-base font-normal [color-scheme:light] dark:[color-scheme:dark]"
                />
              </label>
            ))}
            {(errors.from || errors.to) && (
              <p
                role="alert"
                className="text-sm text-destructive sm:col-span-2"
              >
                {t('admin.finance.closedRange')}
              </p>
            )}
          </fieldset>
          {preview && (
            <>
              <FinanceBreakdown value={preview.row} />
              {!preview.quote.canCreate && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 p-4 text-destructive"
                >
                  {t('admin.sync.cannotCreate')}
                </p>
              )}
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {t('admin.finance.commissionHint')}
              </p>
              <label className="flex items-start gap-3 text-base">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={setConfirmed}
                  disabled={pending || blocked}
                  className="mt-1"
                />
                {t('admin.finance.confirmCreate')}
              </label>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            {preview && (
              <Button
                type="button"
                variant="outline"
                disabled={pending || blocked}
                className="h-11 px-5 text-base"
                onClick={() => {
                  setPreview(null); setConfirmed(false); setError('')
                }}
              >
                <ArrowLeft size={18} />
                {t('admin.finance.editPeriod')}
              </Button>
            )}
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
              disabled={pending || blocked || Boolean(preview) && (!confirmed || !preview.quote.canCreate)}
              className="h-11 px-5 text-base"
            >
              {t(preview ? 'admin.finance.confirmCreateButton' : 'admin.finance.preview')}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
