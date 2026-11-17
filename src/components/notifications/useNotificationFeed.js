import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiError } from '~/utils/http/apiError'

const merge = lists => [...new Map(lists.flat().map(item => [item.id, item])).values()]

export default function useNotificationFeed(load, revision, enabled) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const session = useRef({ pages: 1 })
  useEffect(() => {
    if (!enabled) {
      return
    }
    const controller = new AbortController()
    const pages = session.current.load === load ? session.current.pages : 1
    const current = { load, pages, controller, busy: true }
    session.current = current
    const fetchPages = async () => {
      const lists = []
      let response, page = 1
      do {
        response = await load(page, controller.signal)
        if (response.currentPage !== page) {
          throw new Error('customer.notification.invalidResponse')
        }
        lists.push(response.list)
        if (page >= pages || page >= response.totalPages) {
          break
        }
        page += 1
      } while (!controller.signal.aborted)
      if (!controller.signal.aborted) {
        current.pages = page
        setResult({ load, revision, attempt, data: { ...response, list: merge(lists) }, nextPage: page + 1, error: '', moreError: '', loadingMore: false })
      }
    }
    fetchPages().catch(error => {
      if (!controller.signal.aborted) {
        setResult({ load, revision, attempt, data: null, error: getApiError(error) })
      }
    }).finally(() => {
      current.busy = false
    })
    return () => controller.abort()
  }, [load, revision, attempt, enabled])
  const loading = enabled && (result?.load !== load || result?.revision !== revision || result?.attempt !== attempt)
  const data = enabled && result?.load === load ? result.data : null
  const hasMore = !!data && result.nextPage <= data.totalPages
  const loadMore = useCallback(async () => {
    const current = session.current
    if (!enabled || loading || !hasMore || current.busy || current.controller?.signal.aborted) {
      return
    }
    current.busy = true
    setResult(previous => ({ ...previous, loadingMore: true, moreError: '' }))
    try {
      const response = await load(result.nextPage, current.controller.signal)
      if (response.currentPage !== result.nextPage) {
        throw new Error('customer.notification.invalidResponse')
      }
      if (!current.controller.signal.aborted) {
        current.pages = result.nextPage
        setResult(previous => ({ ...previous, data: { ...response, list: merge([previous.data.list, response.list]) }, nextPage: result.nextPage + 1, loadingMore: false, moreError: '' }))
      }
    } catch (error) {
      if (!current.controller.signal.aborted) {
        setResult(previous => ({ ...previous, loadingMore: false, moreError: getApiError(error) }))
      }
    } finally {
      current.busy = false
    }
  }, [enabled, loading, hasMore, load, result?.nextPage])
  return { data, loading, error: loading ? '' : result?.error || '', retry: () => setAttempt(value => value + 1), hasMore, loadMore, loadingMore: !loading && !!result?.loadingMore, moreError: loading ? '' : result?.moreError || '' }
}
