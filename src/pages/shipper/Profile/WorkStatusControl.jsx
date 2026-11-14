import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Power } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import FormError from '~/components/ui/FormError'
import ActionConfirmationDialog from '~/components/ActionConfirmationDialog'
import { shipperWorkspaceApi } from '~/apis/shipper/shipperWorkspaceApi'
import { getApiError } from '~/utils/http/apiError'

const schema = yup.object({ confirmed: yup.boolean().oneOf([true], 'storage.confirmRequired') })
export default function WorkStatusControl({ profile, onUpdated }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false)
  const [unknown, setUnknown] = useState(shipperWorkspaceApi.hasPendingProfile(profile.id))
  const lock = useRef(false)
  const form = useForm({ resolver: yupResolver(schema), defaultValues: { confirmed: false } })
  const status = profile.status === 3 ? 1 : 3
  const allowed = profile.canChangeWorkStatus === true && (status !== 3 || profile.canGoOffline === true)
  const submit = async () => {
    if (lock.current || blocked && !unknown) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      if (unknown) {
        await shipperWorkspaceApi.checkProfile(profile.id)
      } else {
        const fresh = await shipperWorkspaceApi.profile()
        if (fresh.revision !== profile.revision || !fresh.canChangeWorkStatus || status === 3 && !fresh.canGoOffline) {
          throw new Error('shipper.changed')
        }
        await shipperWorkspaceApi.updateWorkStatus({ id: profile.id, status, expectedRevision: profile.revision, operationId: crypto.randomUUID() })
      }
      setOpen(false); setUnknown(false); onUpdated()
    } catch (failure) {
      const pending = shipperWorkspaceApi.hasPendingProfile(profile.id)
      setUnknown(pending); setBlocked(!pending); setError(pending ? 'shipper.unknown' : getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      <Button
        className="h-11"
        variant="outline"
        disabled={!allowed && !unknown}
        onClick={() => {
          setOpen(true); setBlocked(false); setError(''); form.reset()
        }}
      >
        <Power />
        {t(unknown ? 'admin.sync.checkResult' : status === 1 ? 'storage.goAvailable' : 'storage.goOffline')}
      </Button>
      {!allowed && !unknown && (
        <p className="text-sm text-muted-foreground">
          {t(`storage.blocked.${profile.workStatusBlockedReason || profile.goOfflineBlockedReason}`, { defaultValue: t('storage.statusBlocked') })}
        </p>
      )}
      {open && (
        <ActionConfirmationDialog
          title={t('storage.workStatus')}
          description={t('storage.workStatusHint')}
          icon={Power}
          pending={busy}
          disabled={blocked}
          error={error}
          onClose={() => {
            setOpen(false); onUpdated()
          }}
          confirmLabel={t(unknown ? 'admin.sync.checkResult' : status === 1 ? 'storage.goAvailable' : 'storage.goOffline')}
          onConfirm={() => unknown ? submit() : form.handleSubmit(submit)()}
        >
          {!unknown && (
            <>
              <label className="flex items-start gap-3">
                <Controller
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={busy || blocked}
                    />
                  )}
                />
                {t('storage.confirmed')}
              </label>
              <FormError>
                {form.formState.errors.confirmed?.message}
              </FormError>
            </>
          )}
        </ActionConfirmationDialog>
      )}
    </div>
  )
}
