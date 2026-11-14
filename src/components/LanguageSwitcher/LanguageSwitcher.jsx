import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { setLanguage } from '~/redux/preferences/preferencesSlice'
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, UI_TRANSITIONS } from '~/utils/config/constants'
import { cn } from '~/lib/utils'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const currentLanguage = i18n.resolvedLanguage || DEFAULT_LANGUAGE
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <Button
            variant="outline"
            size="icon"
            className="group size-10 gap-0.5 rounded-full bg-card p-1"
            aria-label={t('common.changeLanguage')}
          />
        )}
      >
        <span className="text-xs font-bold leading-4">
          {currentLanguage.toUpperCase()}
        </span>
        <ChevronDown
          className={cn('size-3 group-data-[popup-open]:rotate-180', UI_TRANSITIONS.ICON)}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        {LANGUAGE_OPTIONS.map((language) => (
          <DropdownMenuItem
            key={language.value}
            lang={language.value}
            aria-current={currentLanguage === language.value ? 'true' : undefined}
            onClick={() => dispatch(setLanguage(language.value))}
          >
            {language.label}
            {currentLanguage === language.value && (
              <Check
                className="ml-auto size-4 text-primary"
                aria-hidden="true"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
