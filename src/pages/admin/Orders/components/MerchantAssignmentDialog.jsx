import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Store, WandSparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminOrderApi } from '~/apis/admin/adminOrderApi'
import { sameOrderState } from '~/utils/orderManagement'
import { canAssignMerchant, unknownResult } from '../ordersModel'
import { getApiError } from '~/utils/apiError'
import { formatNumber } from '~/utils/formats'
import { notify } from '~/utils/notifications'

export default function MerchantAssignmentDialog({ id, ids, onClose, onSaved }) {
  const { t } = useTranslation()
  const bulk = !!ids
  const [selected, setSelected] = useState(''), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const load = useCallback(async signal => {
    const orderIds = ids || [id]
    const snapshots = []
    for (const orderId of orderIds) {
      const order = await adminOrderApi.detail(orderId, signal)
      if (!canAssignMerchant(order)) {
        throw new Error('admin.orderManagement.changed')
      }
      snapshots.push(order)
    }
    return { snapshots, value: bulk ? await adminOrderApi.suggest(orderIds, signal) : await adminOrderApi.candidates(id, signal) }
  }, [id, ids, bulk])
  const resource = useCatalogResource(load)
  const value = resource.data?.value
  const suggestions = bulk && value ? value : []
  const pairs = bulk ? suggestions.filter(item => item.suggested).map(item => ({ orderId: item.orderId, merchantId: item.suggested.merchantId })) : selected ? [{ orderId: id, merchantId: selected }] : []
  const submit = async () => {
    if (lock.current || blocked || !pairs.length || resource.loading) {
      return
    }
    lock.current = true; setPending(true); setError('')
    let writing = false
    try {
      for (const pair of pairs) {
        const current = await adminOrderApi.detail(pair.orderId)
        const snapshot = resource.data.snapshots.find(item => item.id === pair.orderId)
        if (!canAssignMerchant(current) || !sameOrderState(snapshot, current) || current.merchantId !== snapshot.merchantId) {
          setBlocked(true); setError('admin.orderManagement.changed'); return
        }
        const candidates = await adminOrderApi.candidates(pair.orderId)
        const target = candidates.merchants.find(item => item.merchantId === pair.merchantId)
        const reviewed = bulk ? suggestions.find(item => item.orderId === pair.orderId)?.suggested : value.merchants.find(item => item.merchantId === pair.merchantId)
        if (!target || !reviewed || target.currentLoad >= target.maxCapacity || ['commissionRate', 'maxCapacity', 'businessName', 'priority'].some(key => target[key] !== reviewed[key])) {
          setBlocked(true); setError('admin.orderManagement.changed'); return
        }
      }
      writing = true
      if (bulk) {
        await adminOrderApi.autoAssign(pairs)
      } else {
        await adminOrderApi.assignMerchant(id, selected)
      }
      notify.success('admin.orderManagement.assigned'); onSaved()
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
      <DialogContent
        closeLabel="common.close"
        className="max-w-2xl"
      >
        <div className="-mx-6 -mt-6 border-b border-primary/15 bg-primary/5 px-6 py-5 sm:-mx-8 sm:-mt-8 sm:px-8">
          <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-semibold">
            {bulk ? <WandSparkles className="text-primary" /> : <Store className="text-primary" />}
            {t(bulk ? 'admin.orderManagement.suggest' : 'admin.orderManagement.assignMerchant')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6">
            {t(bulk ? 'admin.orderManagement.suggestHint' : 'admin.orderManagement.assignHint')}
          </DialogDescription>
        </div>
        <div className="mt-5 space-y-4">
          {resource.loading || resource.error || !value ? (
            <ResourceFeedback
              {...resource}
              loadingText="admin.loading"
            />
          ) : bulk ? (
            <div className="space-y-3">
              {suggestions.map(item => (
                <div
                  key={item.orderId}
                  className="rounded-xl border border-border p-4"
                >
                  <p className="border-b border-border pb-3 font-medium">
                    {item.orderCode}
                  </p>
                  {item.suggested ? (
                    <>
                      <p className="mt-2 text-primary">
                        {item.suggested.businessName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('admin.orderManagement.load', { current: item.suggested.currentLoad, max: item.suggested.maxCapacity })}
                        {' '}
                        ·
                        {' '}
                        {t('admin.orderManagement.score', { value: formatNumber(item.suggested.score) })}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      {t('admin.orderManagement.noCandidate')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : !value.merchants.length ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.orderManagement.noCandidate')}
            </p>
          ) : (
            <fieldset
              disabled={pending || blocked}
              className="space-y-3"
            >
              <legend className="mb-4 w-full border-b border-border pb-3 font-medium">
                {value.order.orderCode}
              </legend>
              {value.merchants.map(item => (
                <label
                  key={item.merchantId}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected === item.merchantId ? 'border-primary bg-primary/5' : 'border-border'} ${item.currentLoad >= item.maxCapacity ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="merchant"
                    aria-label={item.businessName}
                    checked={selected === item.merchantId}
                    disabled={item.currentLoad >= item.maxCapacity}
                    onChange={() => setSelected(item.merchantId)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block break-words font-medium">
                      {item.businessName}
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {t('admin.orderManagement.load', { current: item.currentLoad, max: item.maxCapacity })}
                      {' '}
                      ·
                      {' '}
                      {t('admin.orderManagement.priority', { value: item.priority })}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {t('admin.orderManagement.score', { value: formatNumber(item.score) })}
                      {item.distanceKm != null && ` · ${formatNumber(item.distanceKm)} km`}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {t('admin.merchants.fields.commissionRate')}
                      :
                      {item.commissionRate}
                      %
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {error && (
            <p
              role="alert"
              className="text-sm leading-6 text-destructive"
            >
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              variant="secondary"
              className="h-11 px-5 text-base"
              onClick={onClose}
              disabled={pending}
            >
              {t('common.close')}
            </Button>
            <Button
              className="h-11 px-6 text-base"
              disabled={pending || blocked || resource.loading || !!resource.error || !pairs.length}
              onClick={submit}
            >
              {t(pending ? 'admin.orderManagement.saving' : bulk ? 'admin.orderManagement.confirmBatch' : 'admin.orderManagement.confirmAssign', { count: pairs.length })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
