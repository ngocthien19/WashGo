import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTheme } from '~/hooks/useTheme'
import { THEME_MODES } from '~/utils/config/constants'
import { cn } from '~/lib/utils'

export default function ThemeToggle({ inline = false }) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const label = theme === THEME_MODES.DARK ? t('common.switchToLightMode') : t('common.switchToDarkMode')

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-10 shrink-0 rounded-full bg-card text-foreground', !inline && 'fixed right-4 top-4 z-50 shadow-sm sm:right-6 sm:top-6')}
      aria-label={label}
      onClick={toggleTheme}
    >
      {theme === THEME_MODES.DARK ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  )
}
