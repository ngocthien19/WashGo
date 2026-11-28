import { DEFAULT_LANGUAGE, GOOGLE_SIGN_IN } from '~/utils/config/constants'

let sdkPromise = null
let initializedClientId = null
let credentialHandler = null
let sdkLocale = null
let sdkScript = null
let loading = false
let requestedLocale = null

export const loadGoogleIdentity = (language = DEFAULT_LANGUAGE) => {
  const locale = language.toLowerCase().startsWith('en') ? 'en' : 'vi'
  requestedLocale = locale
  if (sdkPromise && sdkLocale === locale) {
    return sdkPromise
  }
  // Finish the current load before replacing the SDK language. Concurrent
  // locale scripts can otherwise overwrite each other's global Google API.
  if (loading) {
    return sdkPromise.catch(() => {}).then(() => loadGoogleIdentity(requestedLocale))
  }

  sdkScript?.remove()
  sdkLocale = locale
  initializedClientId = null
  loading = true

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    sdkScript = script
    const fail = () => {
      clearTimeout(timer)
      script.onload = null
      script.onerror = null
      script.remove()
      sdkPromise = null
      sdkLocale = null
      loading = false
      reject(new Error('common.unableToConnectToGooglePleaseTryAgainOr'))
    }
    const timer = setTimeout(fail, GOOGLE_SIGN_IN.LOAD_TIMEOUT_MS)
    const url = new URL(GOOGLE_SIGN_IN.SCRIPT_URL)
    url.searchParams.set('hl', locale)
    script.src = url.toString()
    script.async = true
    script.defer = true
    script.onerror = fail
    script.onload = () => {
      if (!window.google?.accounts?.id) {
        fail()
        return
      }
      clearTimeout(timer)
      loading = false
      resolve(window.google.accounts.id)
    }
    document.head.appendChild(script)
  })

  return sdkPromise
}

export const subscribeGoogleCredential = (googleIdentity, handler) => {
  credentialHandler = handler
  if (initializedClientId !== GOOGLE_SIGN_IN.CLIENT_ID) {
    googleIdentity.initialize({
      client_id: GOOGLE_SIGN_IN.CLIENT_ID,
      auto_select: false,
      callback: (response) => credentialHandler?.(response)
    })
    initializedClientId = GOOGLE_SIGN_IN.CLIENT_ID
  }
  return () => {
    if (credentialHandler === handler) {
      credentialHandler = null
    }
  }
}
