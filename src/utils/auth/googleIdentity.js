import { GOOGLE_SIGN_IN } from '~/utils/config/constants'

let sdkPromise = null
let initializedClientId = null
let credentialHandler = null

export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id)
  }
  if (sdkPromise) {
    return sdkPromise
  }

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      clearTimeout(timer)
      script.remove()
      sdkPromise = null
      reject(new Error('common.unableToConnectToGooglePleaseTryAgainOr'))
    }
    const timer = setTimeout(fail, GOOGLE_SIGN_IN.LOAD_TIMEOUT_MS)
    script.src = GOOGLE_SIGN_IN.SCRIPT_URL
    script.async = true
    script.defer = true
    script.onerror = fail
    script.onload = () => {
      if (!window.google?.accounts?.id) {
        fail()
        return
      }
      clearTimeout(timer)
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
