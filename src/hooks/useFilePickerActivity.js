import { useEffect, useRef } from 'react'

// Native file dialogs return focus without navigating away from the app.
export default function useFilePickerActivity() {
  const active = useRef(false)
  useEffect(() => {
    let releaseTimer
    const isFileInput = target => target instanceof HTMLInputElement && target.type === 'file'
    const release = () => {
      clearTimeout(releaseTimer)
      // Focus, change and cancel can arrive in either order in the same turn.
      releaseTimer = setTimeout(() => {
        active.current = false
      }, 0)
    }
    const opening = event => {
      if (isFileInput(event.target) && !event.target.disabled) {
        clearTimeout(releaseTimer)
        active.current = true
      }
    }
    const settled = event => {
      if (isFileInput(event.target)) {
        release()
      }
    }
    const focused = () => {
      if (active.current) {
        release()
      }
    }
    document.addEventListener('click', opening, true)
    document.addEventListener('change', settled, true)
    document.addEventListener('cancel', settled, true)
    window.addEventListener('focus', focused)
    return () => {
      clearTimeout(releaseTimer)
      active.current = false
      document.removeEventListener('click', opening, true)
      document.removeEventListener('change', settled, true)
      document.removeEventListener('cancel', settled, true)
      window.removeEventListener('focus', focused)
    }
  }, [])
  return active
}
