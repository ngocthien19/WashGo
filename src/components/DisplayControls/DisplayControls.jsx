import ThemeToggle from '~/components/ThemeToggle/ThemeToggle'
import LanguageSwitcher from '~/components/LanguageSwitcher/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

export default function DisplayControls({ variant = 'floating', immediateTheme = false }) {
  const { t } = useTranslation()
  if (variant === 'menu') {
    return (
      <dl className="mb-3 grid gap-3 px-4 text-base">
        <div className="flex items-center justify-between gap-4">
          <dt>
            {t('common.languageLabel')}
            :
          </dt>
          <dd>
            <LanguageSwitcher />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>
            {t('common.appearanceLabel')}
            :
          </dt>
          <dd>
            <ThemeToggle
              inline
              immediate={immediateTheme}
            />
          </dd>
        </div>
      </dl>
    )
  }
  return (
    <div className={variant === 'inline' ? 'flex shrink-0 gap-2' : 'fixed right-4 top-4 z-50 flex gap-2 rounded-full bg-background/90 p-1 backdrop-blur sm:right-6 sm:top-6'}>
      <LanguageSwitcher />
      <ThemeToggle inline />
    </div>
  )
}
