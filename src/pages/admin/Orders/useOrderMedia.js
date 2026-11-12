import { useCallback, useMemo } from 'react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminOrderApi } from '~/apis/admin/adminOrderApi'
import { isId } from '../Merchants/merchantModel'

export const mediaKey = (kind, id) => `${kind}:${id}`
export default function useOrderMedia(order) {
  const jobs = useMemo(() => {
    if (!order || Array.isArray(order.merchantImageUrls) && Array.isArray(order.lockerImageUrls) && Array.isArray(order.returnLockerImageUrls) && order.items.every(item => Array.isArray(item.serviceImageUrls))) {
      return []
    }
    const items = [['merchant', order.merchantId], ['locker', order.lockerId], ['locker', order.returnLockerId], ...order.items.map(item => ['service', item.serviceId])]
    return [...new Map(items.filter(([, id]) => isId(id)).map(([kind, id]) => [mediaKey(kind, id), { kind, id }])).values()]
  }, [order])
  const load = useCallback(async signal => {
    const result = {}
    for (let index = 0; index < jobs.length; index += 4) {
      const batch = jobs.slice(index, index + 4)
      const responses = await Promise.allSettled(batch.map(job => adminOrderApi.media(job.kind, job.id, signal)))
      responses.forEach((response, i) => {
        if (response.status === 'fulfilled') {
          result[mediaKey(batch[i].kind, batch[i].id)] = response.value
        }
      })
    }
    return result
  }, [jobs])
  return useCatalogResource(load).data || {}
}
