import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { Warehouse } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { adminOrderApi } from '~/apis/admin/adminOrderApi'
import { sameOrderState } from '~/utils/orderManagement'
import { canStore, unknownResult } from '../ordersModel'
import { notify } from '~/utils/notifications'
import { getApiError } from '~/utils/apiError'

const schema = yup.object({ storageLocation: yup.string().trim().required().max(200), storageReference: yup.string().trim().required().max(120), note: yup.string().trim().max(140) })
export default function StorageDialog({ order, onClose, onSaved }) {
  const { t } = useTranslation()
  const lock = useRef(false)
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: { storageLocation: '', storageReference: '', note: '' } })
  const submit = async values => {
    if (lock.current || blocked) {
      return
    }
    lock.current = true; setPending(true); setError('')
    let writing = false
    try {
      const current = await adminOrderApi.detail(order.id)
      if (!sameOrderState(order, current) || !canStore(current)) {
        setBlocked(true); setError('admin.orderManagement.changed'); return
      }
      writing = true; await adminOrderApi.store(order.id, values)
      notify.success('admin.orderManagement.stored'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownResult(failure)
      setBlocked(unknown || failure.response?.status === 409)
      const message = unknown ? 'admin.orderManagement.unknown' : getApiError(failure)
      setError(message); notify.error(message)
    } finally {
      lock.current = false; setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !lock.current) {
          onClose()
        }
      }}
    >
      <DialogContent closeLabel="common.close">
        <div className="-mx-6 -mt-6 border-b border-primary/15 bg-primary/5 px-6 py-5 sm:-mx-8 sm:-mt-8 sm:px-8">
          <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-semibold">
            <Warehouse className="text-primary" />
            {t('admin.orderManagement.store')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6">
            {t('admin.orderManagement.storeHint', { code: order.orderCode })}
          </DialogDescription>
        </div>
        <form
          className="mt-5 space-y-5"
          onSubmit={(event) => handleSubmit(submit)(event)}
        >
          <fieldset
            disabled={pending || blocked}
            className="space-y-4"
          >
            {['storageLocation', 'storageReference', 'note'].map(key => (
              <label
                key={key}
                className="flex flex-col gap-3 text-sm font-medium"
              >
                <span>
                  {t(`admin.orderManagement.${key}`)}
                  {key !== 'note' && <span className="ml-1 text-destructive">*</span>}
                </span>
                <Input
                  {...register(key)}
                  aria-label={t(`admin.orderManagement.${key}`)}
                  aria-invalid={!!errors[key]}
                  maxLength={key === 'storageLocation' ? 200 : key === 'storageReference' ? 120 : 140}
                  placeholder={t(`admin.orderManagement.${key}Placeholder`)}
                  className="h-11 font-normal"
                />
                {errors[key] && (
                  <span className="text-xs text-destructive">
                    {t('admin.merchants.invalidField')}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onClose}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              disabled={pending || blocked}
              className="h-11 px-6 text-base"
            >
              {t('admin.orderManagement.confirmStore')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
