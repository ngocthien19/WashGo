import ThemeToggle from '~/components/ThemeToggle/ThemeToggle'
import LanguageSwitcher from '~/components/LanguageSwitcher/LanguageSwitcher'

export default function DisplayControls() {
  return (
    <div className="fixed right-4 top-4 z-50 flex gap-2 rounded-full bg-background/90 p-1 backdrop-blur sm:right-6 sm:top-6">
      <LanguageSwitcher />
      <ThemeToggle inline />
    </div>
  )
}
