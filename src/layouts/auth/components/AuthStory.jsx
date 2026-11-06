import { useTranslation } from 'react-i18next'
import { Clock3, ShieldCheck, Sparkles } from 'lucide-react'
import AuthIllustration from './AuthIllustration'
import AuthBrand from '~/pages/auth/components/AuthBrand'

const benefits = [
  { icon: Clock3, label: 'auth.convenience247' },
  { icon: ShieldCheck, label: 'auth.safeAndSecure' },
  { icon: Sparkles, label: 'auth.cleanJustAsYouLike' }
]

export default function AuthStory() {
  const { t } = useTranslation()
  return (
    <aside className="relative hidden h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-primary/10 px-8 py-10 md:flex lg:px-14 xl:px-20 [@media(max-height:800px)]:py-6">
      <AuthBrand />
      <div className="my-auto w-full max-w-xl self-center py-10 [@media(max-height:800px)]:py-4">
        <h1 className="mb-4 mt-5 text-[27px] font-bold leading-snug tracking-tight lg:text-4xl [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:text-2xl">
          {t('auth.moreTimeForLife')}
          <br />
          <span className="text-blue-600 dark:text-blue-300">
            {t('auth.lessTimeOnLaundry')}
          </span>
        </h1>
        <p className="text-base leading-7 text-muted-foreground [@media(max-height:650px)]:hidden">
          {t('auth.aLittleConvenienceEveryDay')}
          <br />
          {t('auth.dropYourLaundryInALockerWashgoHandlesThe')}
        </p>
        <AuthIllustration />
        <div className="flex flex-wrap justify-between gap-3 border-t border-primary/20 pt-6 [@media(max-height:650px)]:hidden">
          {benefits.map(({ icon: Icon, label }) => (
            <span
              key={t(label)}
              className="flex items-center gap-1.5 text-base text-blue-900/70 dark:text-blue-200/80"
            >
              <Icon size={17} />
              {t(label)}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
