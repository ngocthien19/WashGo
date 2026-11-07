import { useEffect, useRef, useState } from 'react'
import { LOCKER_MAP } from '~/utils/constants'

export default function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const active = useRef(true)
  const pending = useRef(null)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  const requestLocation = () => {
    if (pending.current) {
      return pending.current
    }
    if (!navigator.geolocation) {
      setLocationError('customer.yourBrowserDoesNotSupportLocationYouCanStill')
      return Promise.resolve(null)
    }
    setLocating(true)
    setLocationError('')
    pending.current = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude }
        if (active.current) {
          setPosition(next)
          setLocating(false)
        }
        resolve(next)
      }, (error) => {
        if (active.current) {
          setLocating(false)
          setLocationError(error.code === 1
            ? 'customer.locationPermissionHasNotBeenGrantedEnableItIn'
            : 'customer.weCouldNotGetYourLocationPleaseTryAgain')
        }
        resolve(null)
      }, { timeout: LOCKER_MAP.LOCATION_TIMEOUT_MS, maximumAge: LOCKER_MAP.LOCATION_MAX_AGE_MS })
    }).finally(() => {
      pending.current = null
    })
    return pending.current
  }

  // Location stays in this layout's memory; it is never persisted or added to the URL.
  return { position, locating, locationError, requestLocation }
}
