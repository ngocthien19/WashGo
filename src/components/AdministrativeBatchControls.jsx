import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { administrativeBatch, adminOperation, newOperationId, validateBatch } from '~/apis/admin/adminWrite'
import { notify } from '~/utils/notifications/notifications'
import { getApiError } from '~/utils/http/apiError'

export default function AdministrativeBatchControls({ module, path, command, label, destructive, onClose, onSaved, onFreeze, onBusy }) {
  const { t } = useTranslation()
  const lock = useRef(false), submitted = useRef(null)
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [error, setError] = useState('')
  const run = async (lookup = false) => {
    if (lock.current || unknown && !lookup) {
      return
    }
    lock.current = true; setBusy(true); onBusy(true); setError('')
    try {
      if (!lookup) {
        if (!command.items.length || command.items.some(item => typeof item.expectedVersion !== 'string' || !item.expectedVersion)) {
          throw new Error('admin.sync.missingVersion')
        }
        submitted.current = { ...command, operationId: newOperationId() }; onFreeze(true)
      }
      const body = submitted.current
      let result
      if (lookup) {
        const operation = await adminOperation(module, body.operationId)
        if (operation.state !== 'Completed' || operation.action !== 'Batch' || operation.resourceId !== 'batch') {
          throw new Error('admin.sync.processing')
        }
        result = validateBatch(operation.result?.data, body.operationId, body.items)
      } else {
        result = await administrativeBatch(module, path, body)
      }
      const succeeded = result.items.filter(item => item.succeeded).length
      if (result.totals) {
        notify.success('admin.sync.batchOutcomes', result.totals)
      } else {
        notify.success('admin.sync.batchResult', { succeeded, failed: result.items.length - succeeded })
      }
      onSaved()
    } catch (failure) {
      const uncertain = lookup || failure.uncertain || !failure.response || failure.response.status >= 500
      // Local validation failures have not sent anything.
      const unresolved = !!submitted.current && uncertain
      setUnknown(unresolved); if (!unresolved) {
        onFreeze(false)
      }
      setError(unresolved ? 'admin.sync.batchUnknown' : getApiError(failure))
    } finally {
      lock.current = false; setBusy(false); onBusy(false)
    }
  }
  return (
    <>
      <FormError>
        {error}
      </FormError>
      <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={onClose}
          className="h-11 px-5 text-base"
        >
          {t('common.close')}
        </Button>
        {unknown ? (
          <Button
            disabled={busy}
            onClick={() => run(true)}
            className="h-11 px-5 text-base"
          >
            {t('admin.sync.checkResult')}
          </Button>
        ) : (
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy || !command.items.length}
            onClick={() => run()}
            className="h-11 px-5 text-base"
          >
            {label}
          </Button>
        )}
      </footer>
    </>
  )
}
