import useVideos from '~/hooks/useVideos'
import CustomerVideoPicker from '~/components/customer/CustomerVideoPicker'
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
import { CUSTOMER_ROUTES, INCIDENT_CONFIG, INCIDENT_TYPES, INCIDENT_SEVERITIES, TEXT_LINK_STYLES } from '~/utils/config/constants'
import { formatDateTime } from '~/utils/format/formats'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'
import { incidentSchema } from '../incidentModel'

export default function IncidentReportDialog({ order, onClose, eligibility, initialIncident, onSaved }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const selection = useCustomerImages(INCIDENT_CONFIG.MAX_IMAGES, initialIncident?.imageUrls || [])
  const videos = useVideos(initialIncident?.videoUrls || [])
  const [clientRequestId] = useState(() => crypto.randomUUID())
  const submittedPayload = useRef(null)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const deadline = !initialIncident && eligibility?.reportDeadline ? Date.parse(eligibility.reportDeadline) : null
  // Eligibility is authoritative; a misconfigured device clock must not reject a valid report.
  const expired = !initialIncident && eligibility?.canReport === false
  const { control, register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(incidentSchema), defaultValues: { type: initialIncident?.type || 1, severity: initialIncident?.severity || 1, description: initialIncident?.description || '' } })
  const description = useWatch({ control, name: 'description' })
  const submit = async (values) => {
    if (lock.current || uncertain) {
      return
    }
    if (expired) {
      setError(eligibility.reason || 'customer.sync.notEligible')
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
      if (initialIncident) {
        const fresh = await customerIncidentApi.get(initialIncident.id)
        if (!fresh.canEdit || JSON.stringify([fresh.type, fresh.severity, fresh.description, fresh.imageUrls, fresh.videoUrls]) !== JSON.stringify([initialIncident.type, initialIncident.severity, initialIncident.description, initialIncident.imageUrls, initialIncident.videoUrls])) {
          throw new Error('customer.sync.incidentChanged')
        }
      } else {
        const fresh = await customerIncidentApi.eligibility(order.id)
        if (!fresh.canReport) {
          throw new Error(fresh.reason || 'customer.sync.notEligible')
        }
      }
      const imageUrls = await selection.upload()
      const videoUrls = await videos.upload()
      submittedPayload.current = { orderId: order.id, ...values, imageUrls, videoUrls, clientRequestId }
      posting = true
      const incident = initialIncident ? await customerIncidentApi.update(initialIncident.id, submittedPayload.current) : await customerIncidentApi.create(submittedPayload.current)
      notify.success('customer.incidents.submitted')
      onSaved?.(incident)
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
              {t(initialIncident ? 'customer.sync.editIncident' : 'customer.incidents.report')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm text-muted-foreground">
              {order.orderCode}
              {!initialIncident && ` · ${t('customer.incidents.reportHint')}`}
            </DialogDescription>
          </div>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
              <Info className="mt-1 size-4 shrink-0" />
              <span>
                {initialIncident ? t('customer.sync.editIncidentHint') : expired ? t('customer.incidents.expired') : deadline ? t('customer.incidents.deadline', { date: formatDateTime(new Date(deadline).toISOString()) }) : t('customer.incidents.windowHint')}
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
              <CustomerVideoPicker
                selection={videos}
                disabled={busy || uncertain || expired}
              />
            </fieldset>
            <FormError>
              {error === 'customer.incidents.imagesRequired' && selection.images.length ? '' : error}
            </FormError>
            {uncertain && !initialIncident && (
              <Button
                className="h-11 text-base px-4"
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (lock.current) {
                    return
                  }
                  lock.current = true; setBusy(true)
                  try {
                    const found = await customerIncidentApi.request(clientRequestId)
                    if (found) {
                      navigate(CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', found.id)); onClose()
                    } else {
                      setError('customer.sync.requestNotFound')
                    }
                  } catch (failure) {
                    setError(getApiError(failure))
                  } finally {
                    lock.current = false; setBusy(false)
                  }
                }}
              >
                {t('customer.sync.checkRequest')}
              </Button>
            )}
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
              className="h-12 rounded-xl px-4 text-base"
              disabled={busy}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              className="h-12 rounded-xl px-4 text-base"
              disabled={busy || uncertain || expired}
            >
              <Send size={16} />
              {t(busy ? 'customer.incidents.sending' : initialIncident ? 'customer.sync.saveIncident' : 'customer.incidents.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
