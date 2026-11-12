import useImages from '~/hooks/useImages'
import ImagePicker from '~/components/ImagePicker'
import { useCallback, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckCheck, X, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { SelectField } from '~/components/ui/select'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminComplaintApi, compensationKeys } from '~/apis/admin/adminComplaintApi'
import { formatCurrency } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { ADMIN_ROUTES } from '~/utils/constants'
import { actionSchema, canAct, snapshot, unknownWrite } from '../complaintModel'
import useComplaintContacts from '../useComplaintContacts'
import ComplaintContact from './ComplaintContact'
import { customerContact } from '../complaintContacts'

export default function ComplaintActionDialog({ id, kind, onClose, onSaved }) {
  const { t } = useTranslation()
  const load = useCallback(signal => adminComplaintApi.detail(id, signal), [id])
  const loadSettings = useCallback(signal => kind === 'resolve' ? adminComplaintApi.settings(signal) : Promise.resolve(null), [kind])
  const resource = useCatalogResource(load), settings = useCatalogResource(loadSettings), value = resource.data
  const contacts = useComplaintContacts(value)
  const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(actionSchema(kind)), defaultValues: { note: '', reference: '', responsibleParty: '', compensationLevel: 0, itemValue: '' } })
  const level = useWatch({ control, name: 'compensationLevel' }), itemValue = useWatch({ control, name: 'itemValue' })
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [confirmed, setConfirmed] = useState(false), [error, setError] = useState('')
  const proof = useImages(5)
  const locked = useRef(false)
  const submit = async values => {
    if (!value || locked.current || blocked || !confirmed || !canAct(value, kind)) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const latest = await load()
      if (snapshot(latest) !== snapshot(value) || !canAct(latest, kind)) {
        setBlocked(true); throw new Error('admin.complaints.changed')
      }
      if (kind === 'resolve') {
        if (!settings.data || JSON.stringify(await adminComplaintApi.settings()) !== JSON.stringify(settings.data)) {
          setBlocked(true); throw new Error('admin.complaints.settingsChanged')
        }
      }
      const proofImageUrls = kind === 'pay' ? await proof.upload() : []
      writing = true
      if (kind === 'resolve') {
        await adminComplaintApi.resolve(id, { expectedVersion: value.version, expectedSettingsVersion: settings.data?.version, resolutionNote: values.note.trim(), responsibleParty: values.responsibleParty ? Number(values.responsibleParty) : null, compensationLevel: Number(values.compensationLevel), itemValue: values.compensationLevel > 0 ? Number(values.itemValue) : 0 })
      } else if (kind === 'reject') {
        await adminComplaintApi.reject(id, values.note.trim(), value.version)
      } else {
        await adminComplaintApi.pay(id, values.reference.trim(), value.version, proofImageUrls)
      }
      notify.success(`admin.complaints.success.${kind}`); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.complaints.unknown' : getApiError(failure); setError(message); notify.error(message)
    } finally {
      locked.current = false; setPending(false)
    }
  }
  const Icon = kind === 'pay' ? Wallet : kind === 'reject' ? X : CheckCheck
  const allowed = value && canAct(value, kind)
  const percent = level > 0 ? settings.data?.[compensationKeys[level - 1]] : 0
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
        ready={!resource.loading && !settings.loading && !contacts.loading}
        className="max-w-2xl"
        closeLabel="common.close"
      >
        <DialogHeader tone={kind === 'reject' ? 'danger' : kind === 'pay' ? 'success' : 'info'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Icon className={kind === 'reject' ? 'text-destructive' : 'text-primary'} />
            {t(`admin.complaints.${kind}`)}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t(`admin.complaints.hints.${kind}`)}
          </DialogDescription>
        </DialogHeader>
        {kind === 'pay' && value && (
          <div className="mt-5 space-y-3">
            <h2 className="font-semibold">
              {t('admin.sync.paymentProof')}
            </h2>
            <ImagePicker
              selection={proof}
              disabled={pending || blocked}
            />
          </div>
        )}
        {!value ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <form
            noValidate
            onSubmit={event => handleSubmit(submit)(event)}
            className="mt-5 space-y-5"
          >
            <div className="rounded-xl border border-border p-4">
              <p className="font-semibold text-primary">
                {value.orderCode}
              </p>
              <div className="mt-3">
                <ComplaintContact value={contacts.data?.customer || customerContact(value)} />
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
              <Link
                to={`${ADMIN_ROUTES.COMPLAINTS}/${id}`}
                onClick={onClose}
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                {t('admin.complaints.detail')}
              </Link>
              {kind === 'pay' && (
                <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(value.compensationAmount)}
                </p>
              )}
            </div>
            {!allowed && (
              <p
                role="alert"
                className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
              >
                {t('admin.complaints.unavailable')}
              </p>
            )}
            <fieldset
              disabled={pending || blocked || !allowed}
              className="grid min-w-0 gap-4"
            >
              <label className="grid gap-3 text-sm font-medium">
                <span>
                  {t(kind === 'pay' ? 'customer.incidents.reference' : kind === 'reject' ? 'admin.complaints.rejectReason' : 'customer.incidents.resolution')}
                </span>
                {kind === 'pay' ? (
                  <Input
                    {...register('reference')}
                    aria-label={t('customer.incidents.reference')}
                    aria-invalid={!!errors.reference}
                    maxLength={120}
                    placeholder={t('admin.complaints.referenceHint')}
                    className="h-11 rounded-xl text-base font-normal"
                  />
                ) : (
                  <textarea
                    {...register('note')}
                    aria-label={t(kind === 'reject' ? 'admin.complaints.rejectReason' : 'customer.incidents.resolution')}
                    aria-invalid={!!errors.note}
                    maxLength={2000}
                    placeholder={t('admin.complaints.noteHint')}
                    className="min-h-28 rounded-xl border border-input bg-background p-3 text-base font-normal"
                  />
                )}
                {(errors.reference || errors.note) && (
                  <span
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t('admin.complaints.invalidField')}
                  </span>
                )}
              </label>
              {kind === 'resolve' && (
                <>
                  <label className="grid gap-3 text-sm font-medium">
                    <span>
                      {t('customer.incidents.responsibleParty')}
                    </span>
                    <Controller
                      name="responsibleParty"
                      control={control}
                      render={({ field }) => (
                        <SelectField
                          label={t('customer.incidents.responsibleParty')}
                          {...field}
                          onValueChange={field.onChange}
                          options={[{ value: '', label: t('admin.complaints.unspecified') }, ...[1, 2, 3, 4].map(party => ({ value: String(party), label: t(`customer.incidents.parties.${party}`) }))]}
                        />
                      )}
                    />
                  </label>
                  {settings.error && <ResourceFeedback {...settings} />}
                  <label className="grid gap-3 text-sm font-medium">
                    <span>
                      {t('admin.complaints.level')}
                    </span>
                    <Controller
                      name="compensationLevel"
                      control={control}
                      render={({ field }) => (
                        <SelectField
                          label={t('admin.complaints.level')}
                          value={String(field.value)}
                          onValueChange={next => field.onChange(Number(next))}
                          options={[0, ...(settings.data ? [1, 2, 3, 4] : [])].map(next => ({ value: String(next), label: `${t(`admin.complaints.levels.${next}`)}${next > 0 ? ` (${settings.data[compensationKeys[next - 1]]}%)` : ''}` }))}
                        />
                      )}
                    />
                  </label>
                  {level > 0 && (
                    <>
                      <label className="grid gap-3 text-sm font-medium">
                        <span>
                          {t('customer.incidents.itemValue')}
                        </span>
                        <Input
                          {...register('itemValue')}
                          aria-label={t('customer.incidents.itemValue')}
                          aria-invalid={!!errors.itemValue}
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100000000"
                          placeholder={t('admin.complaints.valueHint')}
                          className="h-11 rounded-xl text-base font-normal"
                        />
                        {errors.itemValue && (
                          <span
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {t('admin.complaints.invalidValue')}
                          </span>
                        )}
                      </label>
                      <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                        {t('admin.complaints.estimate', { value: Number(itemValue) > 0 && percent != null ? formatCurrency(Math.round(Number(itemValue) * percent / 100)) : '—' })}
                      </p>
                    </>
                  )}
                </>
              )}
              <label className="flex items-start gap-3 text-base">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={setConfirmed}
                  className="mt-1"
                />
                {t(kind === 'pay' ? 'admin.complaints.confirmPaid' : 'admin.complaints.confirmHint')}
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
                disabled={pending || blocked || !confirmed || !allowed || level > 0 && !settings.data}
                className="h-11 px-5 text-base"
              >
                {t('admin.complaints.confirm')}
              </Button>
            </footer>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
