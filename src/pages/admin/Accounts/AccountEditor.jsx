import OpeningScheduleEditor from '~/components/OpeningSchedule/OpeningScheduleEditor'
import { emptySchedule } from '~/components/OpeningSchedule/scheduleModel'
import { lazy, Suspense, useCallback, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { ImagePlus, MapPinned, Save, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import FormError from '~/components/ui/FormError'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import useImages from '~/hooks/useImages'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminMerchantApi } from '~/apis/admin/adminMerchantApi'
import { accountOperations } from '~/apis/admin/adminAccountApi'
import { AccountField, AccountShell } from './AccountUI'
import { ACCOUNT_ROLES, accountSchema, accountPayload } from './accountModel'
import useAccountCommand from './useAccountCommand'

const AddressPicker = lazy(() => import('~/components/maps/AddressPickerDialog'))
export default function AccountEditor({ account, manageAdmins, onClose, onSaved }) {
  const { t } = useTranslation()
  const editing = Boolean(account)
  const form = useForm({ resolver: yupResolver(accountSchema(editing)), defaultValues: {
    role: account?.role || 'Customer', fullName: account?.fullName || '', email: account?.email || '', phone: account?.phone || '',
    openingSchedule: emptySchedule(), address: '', city: '', latitude: '', longitude: '', merchantId: '', vehicleType: 1, vehiclePlate: '', depositAmount: '', commissionRate: '', serviceRadiusKm: '', maxCapacity: ''
  } })
  const role = useWatch({ control: form.control, name: 'role' })
  const fullName = useWatch({ control: form.control, name: 'fullName' })
  const merchantId = useWatch({ control: form.control, name: 'merchantId' })
  const vehicleType = useWatch({ control: form.control, name: 'vehicleType' })
  const images = useImages(1, account?.avatarUrl ? [account.avatarUrl] : [])
  const command = useAccountCommand({ requiresAuthentication: role === 'Admin', onSaved, setFieldError: form.setError })
  const [mapOpen, setMapOpen] = useState(false)
  const disabled = command.pending || command.locked
  const field = (key, type = 'text', required = false, extra = {}) => (
    <AccountField
      key={key}
      label={key === 'fullName' && !editing && role === 'Merchant' ? 'businessName' : key}
      type={type}
      {...form.register(key)}
      error={form.formState.errors[key]}
      required={required}
      disabled={disabled}
      {...extra}
    />
  )
  const submit = form.handleSubmit(values => command.run(async () => {
    const avatar = editing || ['Customer', 'Admin'].includes(role) ? (await images.upload())[0] || '' : undefined
    const body = accountPayload(values, editing, avatar)
    return accountOperations.send({ action: editing ? 'Update' : 'Create', resourceId: account?.id || 'new', method: editing ? 'patch' : 'post', suffix: editing ? `/${account.id}` : '', body: { ...body, ...(editing ? { expectedRevision: account.revision } : {}) } })
  }))
  return (
    <>
      <AccountShell
        title={editing ? 'accounts.actions.Edit' : 'accounts.create'}
        description={editing ? 'accounts.editDescription' : 'accounts.editorDescription'}
        onClose={onClose}
        busy={command.pending}
        onSubmit={submit}
        footer={(
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={command.pending}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={disabled}
            >
              <Save size={18} />
              {t(command.pending ? 'accounts.saving' : 'accounts.save')}
            </Button>
          </>
        )}
      >
        <FormError>
          {command.error}
        </FormError>
        <div className="grid gap-5 sm:grid-cols-2 [&_label]:text-[14px]">
          {field('fullName', 'text', true, { maxLength: 100 })}
          {field('phone', 'tel', !editing || ['Customer', 'Shipper'].includes(role), { maxLength: 20, autoComplete: 'tel' })}
          {field('email', 'email', !editing, { maxLength: 100, disabled: editing || disabled, autoComplete: 'email' })}
          <SelectField
            label={t('accounts.fields.role')}
            showLabel
            value={role}
            onValueChange={value => form.setValue('role', value)}
            disabled={editing || disabled}
            options={(editing ? [role] : ACCOUNT_ROLES.filter(value => value !== 'Admin' || manageAdmins)).map(value => ({ value, label: t(`accounts.roles.${value}`) }))}
          />
        </div>
        {!editing && role === 'Merchant' && (
          <section className="space-y-5 rounded-2xl border border-border p-5">
            <h3 className="font-semibold">
              {t('accounts.partnerProfile')}
            </h3>
            <fieldset disabled={disabled}>
              <OpeningScheduleEditor control={form.control} />
            </fieldset>
            {field('address', 'text', true)}
            <div className="grid gap-5 sm:grid-cols-2">
              {field('city', 'text', true)}
              {field('serviceRadiusKm', 'number', false, { min: 1, max: 100 })}
              {field('latitude', 'number', true, { step: 'any' })}
              {field('longitude', 'number', true, { step: 'any' })}
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-violet-600 dark:text-violet-300"
              onClick={() => setMapOpen(true)}
              disabled={disabled}
            >
              <MapPinned size={18} />
              {t('accounts.pickMap')}
            </Button>
            <div className="grid gap-5 sm:grid-cols-2">
              {field('depositAmount', 'number', false, { min: 0 })}
              {field('commissionRate', 'number', false, { min: 0, max: 100, step: 'any' })}
              {field('maxCapacity', 'number', false, { min: 1 })}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('accounts.partnerDefaults')}
            </p>
          </section>
        )}
        {!editing && role === 'Shipper' && (
          <section className="space-y-5 rounded-2xl border border-border p-5">
            <h3 className="font-semibold">
              {t('accounts.partnerProfile')}
            </h3>
            <MerchantPicker
              value={merchantId}
              onChange={value => form.setValue('merchantId', value, { shouldValidate: true })}
              disabled={disabled}
            />
            <FormError inline>
              {form.formState.errors.merchantId?.message}
            </FormError>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                showLabel
                label={t('accounts.fields.vehicleType')}
                value={String(vehicleType)}
                onValueChange={value => form.setValue('vehicleType', Number(value))}
                options={[1, 2, 3].map(value => ({ value: String(value), label: t(`accounts.vehicles.${value}`) }))}
                disabled={disabled}
              />
              {field('vehiclePlate', 'text', vehicleType !== 3, { maxLength: 20 })}
            </div>
          </section>
        )}
        {(editing || ['Customer', 'Admin'].includes(role)) && (
          <section className="space-y-4 rounded-2xl border border-border p-5">
            <h3 className="flex justify-between border-b border-border pb-4 text-sm font-semibold">
              {t('accounts.fields.avatarUrl')}
              <span className="text-sm text-muted-foreground">
                {images.images.length}
                /1
              </span>
            </h3>
            {images.images.map(item => (
              <div
                key={item.url}
                className="flex items-center gap-4"
              >
                <UserAvatar
                  avatar={item.url}
                  fullName={fullName}
                  className="size-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('accounts.removeImage')}
                  disabled={disabled}
                  onClick={() => images.removeImage(item)}
                >
                  <X size={18} />
                </Button>
              </div>
            ))}
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 py-3 text-sm text-primary transition-colors delay-0 duration-200 ease-in-out hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring ${disabled || images.images.length ? 'pointer-events-none opacity-50' : ''}`}>
              <ImagePlus size={18} />
              {t('accounts.addImage')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={disabled || images.images.length > 0}
                onChange={event => {
                  images.addFiles([...event.target.files]); event.target.value = ''
                }}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              {t('accounts.avatarHint')}
            </p>
            <FormError inline>
              {images.error || form.formState.errors.avatarUrl?.message}
            </FormError>
          </section>
        )}
        {command.authentication}
      </AccountShell>
      {mapOpen && (
        <Suspense fallback={null}>
          <AddressPicker
            initialCenter={null}
            onClose={() => setMapOpen(false)}
            onApply={value => {
              for (const key of ['address', 'city', 'latitude', 'longitude']) {
                form.setValue(key, (key === 'latitude' || key === 'longitude' ? value.position?.[key] : value[key]) ?? '', { shouldValidate: true, shouldDirty: true })
              }
              setMapOpen(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}

function MerchantPicker({ value, onChange, disabled }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, keyword: '', status: 1 })
  const [chosen, setChosen] = useState(null)
  const [keyword, setKeyword] = useState('')
  const resource = useCatalogResource(useCallback(signal => adminMerchantApi.list(query, signal), [query]))
  const rows = resource.data?.list || []
  const options = rows.map(item => ({ value: item.id, label: item.businessName }))
  if (chosen && !options.some(item => item.value === chosen.value)) {
    options.unshift(chosen)
  }
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <AccountField
            label="merchantSearch"
            value={keyword}
            disabled={disabled}
            onChange={event => setKeyword(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault(); setQuery({ ...query, keyword, page: 1 })
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => setQuery({ ...query, keyword, page: 1 })}
        >
          {t('accounts.searchMerchant')}
        </Button>
      </div>
      {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : (
        <>
          <SelectField
            label={t('accounts.fields.merchantId')}
            showLabel
            value={value}
            onValueChange={next => {
              onChange(next); setChosen(options.find(item => item.value === next))
            }}
            disabled={disabled}
            options={[{ value: '', label: t('accounts.chooseMerchant') }, ...options]}
          />
          <TablePagination
            compact
            currentPage={query.page}
            totalPages={resource.data.totalPages}
            total={resource.data.total}
            pageSize={12}
            rowCount={rows.length}
            onPageChange={page => setQuery({ ...query, page })}
            disabled={disabled}
          />
        </>
      )}
    </div>
  )
}
