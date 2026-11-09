import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { Clock3, CircleX, Percent, ShieldCheck, Save, RotateCcw, ArrowRight, Check } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { adminSystemSettingApi } from '~/apis/admin/adminSystemSettingApi'
import { formatCurrency, formatNumber } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'
import { resolveMessage } from '~/i18n/messages'
import { settingGroups, settingsSchema, settingPayload, settingSnapshot, settingChanges, unknownWrite } from './settingModel'

const icons = { sla: Clock3, commission: Percent, penalty: ShieldCheck }
export default function SettingForm({ group, data, onDirty, onBusy, onSaved }) {
  const { t } = useTranslation()
  const fields = settingGroups[group], Icon = icons[group]
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({ resolver: yupResolver(settingsSchema(group)), defaultValues: settingPayload(group, data) })
  const [review, setReview] = useState(null), [confirmed, setConfirmed] = useState(false), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    onDirty(isDirty)
  }, [isDirty, onDirty])
  const format = (field, value) => field.unit === 'vnd' ? formatCurrency(value) : `${formatNumber(value)} ${t(`admin.settings.units.${field.unit}`)}`
  const sections = group === 'penalty' ? ['fees', 'cancellation', 'compensation'] : [group]
  const save = async () => {
    if (!review || !confirmed || lock.current || blocked) {
      return
    }
    lock.current = true; setPending(true); onBusy(true); setError('')
    let writing = false
    try {
      const latest = await adminSystemSettingApi.get()
      if (settingSnapshot(latest) !== settingSnapshot(data)) {
        setBlocked(true); throw new Error('admin.settings.changed')
      }
      writing = true
      await adminSystemSettingApi.update(group, review)
      notify.success('admin.settings.saved'); setReview(null); onDirty(false); onSaved()
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.settings.unknown' : getApiError(failure)
      setError(message); notify.error(message)
    } finally {
      lock.current = false; setPending(false); onBusy(false)
    }
  }
  return (
    <>
      <form
        noValidate
        onSubmit={event => handleSubmit(values => {
          if (lock.current || blocked || !settingChanges(group, data, values).length) {
            return
          }
          setReview(settingPayload(group, values)); setConfirmed(false); setError('')
        })(event)}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <header className="border-b border-primary/10 bg-primary/5 p-5 sm:p-6">
          <h2 className="flex items-center gap-3 text-xl font-semibold">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon size={23} />
            </span>
            {t(`admin.settings.groups.${group}`)}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            {t(`admin.settings.hints.${group}`)}
          </p>
        </header>
        <fieldset
          disabled={pending || blocked || Boolean(review)}
          className="space-y-6 p-5 sm:p-6"
        >
          {sections.map(section => (
            <section
              key={section}
              className="space-y-5"
            >
              {group === 'penalty' && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
                  <h3 className="flex items-center gap-3 border-b border-primary/15 pb-3 text-xl font-semibold">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
                      aria-hidden="true"
                    >
                      {section === 'fees' ? <Clock3 size={21} /> : section === 'cancellation' ? <CircleX size={21} /> : <ShieldCheck size={21} />}
                    </span>
                    {t(`admin.settings.sections.${section}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`admin.settings.sectionHints.${section}`)}
                  </p>
                </div>
              )}
              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                {fields.filter(field => group !== 'penalty' || field.section === section).map(field => (
                  <div
                    key={field.key}
                    className="min-w-0 space-y-2"
                  >
                    <label
                      htmlFor={field.key}
                      className="block text-sm font-medium"
                    >
                      {t(`admin.settings.fields.${field.key}`)}
                    </label>
                    <div className="relative">
                      <Input
                        {...register(field.key)}
                        id={field.key}
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.decimal ? '0.01' : '1'}
                        inputMode={field.decimal ? 'decimal' : 'numeric'}
                        placeholder={t('admin.settings.placeholder', { min: formatNumber(field.min), max: formatNumber(field.max) })}
                        aria-invalid={Boolean(errors[field.key])}
                        aria-describedby={`${field.key}-hint${errors[field.key] ? ` ${field.key}-error` : ''}`}
                        className="h-12 rounded-xl pr-20 text-base font-medium"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                        {t(`admin.settings.units.${field.unit}`)}
                      </span>
                    </div>
                    <p
                      id={`${field.key}-hint`}
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      {t(`admin.settings.fieldHints.${field.key}`)}
                    </p>
                    {errors[field.key] && (
                      <p
                        id={`${field.key}-error`}
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {t(errors[field.key].message, { min: formatNumber(field.min), max: formatNumber(field.max) })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </fieldset>
        {error && (
          <p
            role="alert"
            className="mx-5 mb-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
          >
            {resolveMessage(error)}
          </p>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/15 p-5 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {t(isDirty ? 'admin.settings.unsaved' : 'admin.settings.upToDate')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!isDirty || pending || blocked || Boolean(review)}
              onClick={() => {
                reset(settingPayload(group, data)); setError('')
              }}
              className="h-11 px-5 text-base"
            >
              <RotateCcw size={18} />
              {t('admin.settings.undo')}
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || pending || blocked || Boolean(review)}
              className="h-11 px-5 text-base"
            >
              <Save size={18} />
              {t('admin.settings.review')}
            </Button>
          </div>
        </footer>
      </form>
      {review && (
        <Dialog
          open
          onOpenChange={open => {
            if (!open && !lock.current) {
              setReview(null)
            }
          }}
        >
          <DialogContent
            className="max-w-2xl"
            closeLabel="common.close"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
                <Icon />
                {t('admin.settings.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="mt-3 text-base text-muted-foreground">
                {t('admin.settings.applyHint')}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <h3 className="border-b border-border pb-3 text-lg font-semibold">
                {t(`admin.settings.groups.${group}`)}
              </h3>
              <dl className="max-h-72 space-y-3 overflow-y-auto">
                {settingChanges(group, data, review).map(field => (
                  <div
                    key={field.key}
                    className="rounded-xl border border-border p-4"
                  >
                    <dt className="text-sm font-medium">
                      {t(`admin.settings.fields.${field.key}`)}
                    </dt>
                    <dd className="mt-2 flex flex-wrap items-center gap-3 text-base">
                      <span className="text-muted-foreground">
                        {format(field, data[field.key])}
                      </span>
                      <ArrowRight
                        size={17}
                        className="text-muted-foreground"
                      />
                      <strong className="font-semibold text-primary">
                        {format(field, review[field.key])}
                      </strong>
                    </dd>
                  </div>
                ))}
              </dl>
              <label className="flex items-start gap-3 text-base">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={setConfirmed}
                  disabled={pending || blocked}
                  className="mt-1"
                />
                {t('admin.settings.confirmCheck')}
              </label>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {resolveMessage(error)}
                </p>
              )}
              <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setReview(null)}
                  className="h-11 px-5 text-base"
                >
                  {t('common.close')}
                </Button>
                <Button
                  disabled={!confirmed || pending || blocked}
                  onClick={save}
                  className="h-11 px-5 text-base"
                >
                  <Check size={18} />
                  {t('admin.settings.confirmSave')}
                </Button>
              </footer>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
