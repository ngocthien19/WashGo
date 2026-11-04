import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { AUTH_LIMITS, PROFILE_LIMITS, IMAGE_UPLOAD, OTP_CONFIG, DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from '~/utils/constants'
import vi from './locales/vi.json'
import en from './locales/en.json'

const resources = {
  vi: { translation: vi },
  en: { translation: en }
}

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGE_OPTIONS.map((language) => language.value),
  interpolation: {
    escapeValue: false,
    defaultVariables: { ...AUTH_LIMITS, ...PROFILE_LIMITS, MAX_IMAGE_MB: IMAGE_UPLOAD.MAX_BYTES / 1024 / 1024, CODE_LENGTH: OTP_CONFIG.CODE_LENGTH }
  },
  react: { useSuspense: false }
})

export default i18n
