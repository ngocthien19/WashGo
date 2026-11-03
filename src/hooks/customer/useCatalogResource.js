import { useEffect, useState } from 'react'
import { getApiError } from '~/utils/apiError'

export default function useCatalogResource(load) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setResult({ load, attempt, data, error: '' })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setResult({ load, attempt, data: null, error: getApiError(error) })
      }
    })
    return () => controller.abort()
  }, [load, attempt])

  const loading = result?.load !== load || result?.attempt !== attempt
  return {
    data: loading ? null : result.data,
    error: loading ? '' : result.error,
    loading,
    retry: () => setAttempt((value) => value + 1)
  }
}
