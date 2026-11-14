import { useSyncExternalStore } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setTheme } from '~/redux/theme/themeSlice'
import { DARK_MODE_MEDIA_QUERY, THEME_MODES } from '~/utils/config/constants'

const subscribe = (callback) => {
  const media = window.matchMedia(DARK_MODE_MEDIA_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

const getSystemDark = () => window.matchMedia(DARK_MODE_MEDIA_QUERY).matches

export const useTheme = () => {
  const mode = useSelector((state) => state.theme.mode)
  const dispatch = useDispatch()
  const systemDark = useSyncExternalStore(subscribe, getSystemDark, () => false)
  const theme = mode === THEME_MODES.SYSTEM
    ? (systemDark ? THEME_MODES.DARK : THEME_MODES.LIGHT)
    : mode

  return {
    theme,
    toggleTheme: () => dispatch(setTheme(theme === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK))
  }
}
