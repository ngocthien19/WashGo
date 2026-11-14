import { useEffect, useState } from 'react'
import { getApiError } from '~/utils/http/apiError'

export default function useCatalogResource(load, revision = 0, keepPreviousData = false) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setResult({ load, attempt, revision, data, error: '' })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setResult({ load, attempt, revision, data: null, error: getApiError(error) })
      }
    })
    return () => controller.abort()
  }, [load, attempt, revision])

  const loading = result?.load !== load || result?.attempt !== attempt || result?.revision !== revision
  return {
    data: loading && !(keepPreviousData && result?.load === load) ? null : result?.data,
    error: loading ? '' : result.error,
    loading,
    retry: () => setAttempt((value) => value + 1)
  }
}
