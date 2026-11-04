import { useLayoutEffect } from 'react'
import { useSelector } from 'react-redux'
import i18n from '~/i18n'
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from '~/utils/constants'

export default function LanguageProvider({ children }) {
  const language = useSelector((state) => state.preferences.language)
  useLayoutEffect(() => {
    const next = LANGUAGE_OPTIONS.find((option) => option.value === language)?.value || DEFAULT_LANGUAGE
    i18n.changeLanguage(next)
    document.documentElement.lang = next
  }, [language])
  return children
}
