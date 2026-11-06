import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, Send, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import FormError from '~/components/ui/FormError'
import CustomerImagePicker from '~/components/customer/CustomerImagePicker'
import useCustomerImages from '~/hooks/customer/useCustomerImages'
import { customerIncidentApi } from '~/apis/customer/customerIncidentApi'
import { CUSTOMER_ROUTES, INCIDENT_CONFIG, INCIDENT_TYPES, INCIDENT_SEVERITIES, TEXT_LINK_STYLES } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { incidentSchema, incidentReportDeadline } from '../incidentModel'

export default function IncidentReportDialog({ order, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const selection = useCustomerImages(INCIDENT_CONFIG.MAX_IMAGES)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const [openedAt] = useState(() => Date.now())
  const deadline = incidentReportDeadline(order)
  const expired = deadline != null && openedAt > deadline
  const { control, register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(incidentSchema), defaultValues: { type: 1, severity: 1, description: '' } })
  const description = useWatch({ control, name: 'description' })
  const submit = async (values) => {
    if (lock.current || uncertain) {
      return
    }
    if (deadline != null && Date.now() > deadline) {
      setError('customer.incidents.expired')
      return
    }
    if (!selection.images.length) {
      setError('customer.incidents.imagesRequired')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    let posting = false
    try {
      const imageUrls = await selection.upload()
      posting = true
      const incident = await customerIncidentApi.create({ orderId: order.id, ...values, imageUrls })
      notify.success('customer.incidents.submitted')
      navigate(CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', incident.id))
      onClose()
    } catch (failure) {
      const unknown = posting && (!failure.response?.status || failure.response.status >= 500)
      setUncertain(unknown)
      setError(unknown ? 'customer.incidents.uncertain' : getApiError(failure))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-2xl overflow-hidden p-0 sm:p-0"
        closeLabel="common.close"
      >
        <form
          onSubmit={(event) => {
            void handleSubmit(submit)(event)
          }}
          className="flex max-h-[85dvh] flex-col"
          noValidate
        >
          <div className="shrink-0 border-b border-border bg-rose-500/5 p-5 pr-14 sm:p-6 sm:pr-14">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <ShieldAlert size={24} />
              </span>
              {t('customer.incidents.report')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm text-muted-foreground">
              {order.orderCode}
              {' '}
              ·
              {' '}
              {t('customer.incidents.reportHint')}
            </DialogDescription>
          </div>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
              <Info className="mt-1 size-4 shrink-0" />
              <span>
                {expired ? t('customer.incidents.expired') : deadline ? t('customer.incidents.deadline', { date: formatDateTime(new Date(deadline).toISOString()) }) : t('customer.incidents.windowHint')}
              </span>
            </p>
            <fieldset
              disabled={busy || uncertain || expired}
              className="min-w-0 space-y-5 disabled:opacity-70"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {[['type', INCIDENT_TYPES], ['severity', INCIDENT_SEVERITIES]].map(([name, options]) => (
                  <div
                    key={name}
                    className="space-y-2"
                  >
                    <label
                      htmlFor={`incident-${name}`}
                      className="text-sm font-semibold"
                    >
                      {t(`customer.incidents.${name}`)}
                    </label>
                    <Controller
                      name={name}
                      control={control}
                      render={({ field }) => (
                        <SelectField
                          id={`incident-${name}`}
                          label={t(`customer.incidents.${name}`)}
                          value={String(field.value)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          disabled={busy || uncertain || expired}
                          options={options.map((value) => ({ value: String(value), label: t(`customer.incidents.${name === 'type' ? 'types' : 'severities'}.${value}`) }))}
                        />
                      )}
                    />
                    <FormError>
                      {errors[name]?.message}
                    </FormError>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="incident-description"
                  className="text-sm font-semibold"
                >
                  {t('customer.incidents.descriptionLabel')}
                </label>
                <textarea
                  id="incident-description"
                  {...register('description')}
                  maxLength={INCIDENT_CONFIG.DESCRIPTION_MAX}
                  aria-invalid={!!errors.description}
                  className="min-h-32 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder={t('customer.incidents.descriptionPlaceholder')}
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {description.length}
                  {' '}
                  /
                  {' '}
                  {INCIDENT_CONFIG.DESCRIPTION_MAX}
                </p>
                <FormError>
                  {errors.description?.message}
                </FormError>
              </div>
              <CustomerImagePicker
                selection={selection}
                disabled={busy || uncertain || expired}
                help={t('customer.incidents.imageHelp')}
              />
            </fieldset>
            <FormError>
              {error === 'customer.incidents.imagesRequired' && selection.images.length ? '' : error}
            </FormError>
            <Link
              to={CUSTOMER_ROUTES.COMPLAINTS}
              onClick={(event) => {
                if (busy) {
                  event.preventDefault()
                }
              }}
              className={TEXT_LINK_STYLES}
            >
              {t('customer.incidents.viewMine')}
            </Link>
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/25 px-5 py-4 sm:px-6">
            <Button
              variant="secondary"
              className="h-11 rounded-xl px-4"
              disabled={busy}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl px-4"
              disabled={busy || uncertain || expired}
            >
              <Send size={16} />
              {t(busy ? 'customer.incidents.sending' : 'customer.incidents.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
