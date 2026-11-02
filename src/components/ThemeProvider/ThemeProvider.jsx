import { useEffect } from 'react'
import { useTheme } from '~/hooks/useTheme'
import { THEME_MODES } from '~/utils/constants'

export default function ThemeProvider({ children }) {
  const { theme } = useTheme()

  useEffect(() => {
    document.documentElement.classList.toggle(THEME_MODES.DARK, theme === THEME_MODES.DARK)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return children
}
