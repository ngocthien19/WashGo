import { useCallback, useMemo } from 'react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderMediaApi } from '~/apis/merchant/merchantOrderMediaApi'

export const mediaKey = (kind, id) => `${kind}:${id}`
export default function useOrderMedia(order) {
  const jobs = useMemo(() => {
    if (!order) {
      return []
    }
    const rows = [['locker', order.lockerId], ['locker', order.returnLockerId], ...order.items.map(item => ['service', item.serviceId])]
    return [...new Map(rows.filter(([, id]) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id || '')).map(([kind, id]) => [mediaKey(kind, id), { kind, id }])).values()]
  }, [order])
  const load = useCallback(async signal => {
    const media = {}
    for (let offset = 0; offset < jobs.length; offset += 4) {
      const batch = jobs.slice(offset, offset + 4)
      const results = await Promise.allSettled(batch.map(job => merchantOrderMediaApi.media(job.kind, job.id, signal)))
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          media[mediaKey(batch[index].kind, batch[index].id)] = result.value
        }
      })
    }
    return media
  }, [jobs])
  return useCatalogResource(load).data || {}
}
