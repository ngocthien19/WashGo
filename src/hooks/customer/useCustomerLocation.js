import { useEffect, useRef, useState } from 'react'
import { LOCKER_MAP } from '~/utils/constants'

export default function useCustomerLocation() {
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
      setLocationError('Trình duyệt chưa hỗ trợ vị trí. Bạn vẫn có thể tìm locker theo địa chỉ.')
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
            ? 'Chưa được cấp quyền vị trí. Bạn có thể bật quyền trong trình duyệt hoặc tìm theo địa chỉ.'
            : 'Không lấy được vị trí hiện tại. Vui lòng thử lại hoặc tìm theo địa chỉ.')
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
