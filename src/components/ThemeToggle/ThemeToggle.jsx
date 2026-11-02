import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTheme } from '~/hooks/useTheme'
import { THEME_MODES } from '~/utils/constants'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const label = theme === THEME_MODES.DARK ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed right-4 top-4 z-50 size-10 shrink-0 rounded-full bg-card text-foreground shadow-sm sm:right-6 sm:top-6"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {theme === THEME_MODES.DARK ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  )
}
