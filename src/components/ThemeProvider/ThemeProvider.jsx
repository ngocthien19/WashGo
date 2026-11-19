import { useLayoutEffect } from 'react'
import { useTheme } from '~/hooks/useTheme'
import { THEME_MODES } from '~/utils/config/constants'

export default function ThemeProvider({ children }) {
  const { theme } = useTheme()

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(THEME_MODES.DARK, theme === THEME_MODES.DARK)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return children
}
