import { useEffect, useRef } from 'react'

// Result regions survive loading while their pagination may unmount.
// Weak keys keep independent tables isolated without retaining removed pages.
const requests = new WeakMap()

export default function usePaginationScroll(page, disabled) {
  const navigationRef = useRef(null)

  useEffect(() => {
    const scope = navigationRef.current?.closest('[data-pagination-scope]')
    const request = scope && requests.get(scope)
    if (!request || request.page !== page || disabled) {
      return
    }
    const frame = requestAnimationFrame(() => {
      if (!scope.isConnected || requests.get(scope) !== request) {
        return
      }
      // Lists with their own vertical viewport also start at their first row.
      scope.querySelectorAll('[data-pagination-scroll]').forEach((element) => {
        element.scrollTo({ top: 0, behavior: 'instant' })
      })
      const header = scope.querySelector('[data-pagination-header], [data-slot="table-header"]') || scope
      header.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
      requests.delete(scope)
    })
    return () => cancelAnimationFrame(frame)
  }, [page, disabled])

  const prepareScroll = (nextPage) => {
    const scope = navigationRef.current?.closest('[data-pagination-scope]')
    if (scope) {
      requests.set(scope, { page: nextPage })
    }
  }

  return { navigationRef, prepareScroll }
}
