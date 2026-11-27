import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa'
import { notify } from '~/utils/notifications/notifications'
import { CUSTOMER_FOOTER, CUSTOMER_ROUTES, TEXT_LINK_STYLES } from '~/utils/config/constants'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import Brand from '~/components/Brand/Brand'
import { cn } from '~/lib/utils'

const socialLinks = [
  { label: 'customer.facebook', icon: FaFacebookF, color: 'border-blue-400/50 text-blue-400 hover:border-blue-300 hover:bg-blue-400/15 hover:text-blue-300 hover:shadow-[0_4px_18px_#60a5fa26] focus-visible:ring-blue-400/40' },
  { label: 'customer.instagram', icon: FaInstagram, color: 'border-pink-400/50 text-pink-400 hover:border-pink-300 hover:bg-pink-400/15 hover:text-pink-300 hover:shadow-[0_4px_18px_#f472b626] focus-visible:ring-pink-400/40' },
  { label: 'customer.tiktok', icon: FaTiktok, color: 'border-white/30 bg-black/30 text-white hover:border-white/60 hover:bg-black/50 hover:text-white hover:shadow-[0_4px_18px_#ffffff14] focus-visible:ring-white/40' }
]

const showPendingContent = () => notify.info('customer.thisContentIsBeingUpdated')

function FooterPendingLink({ children, className }) {
  return (
    <Button
      variant="link"
      onClick={showPendingContent}
      className={cn('h-auto min-w-0 shrink justify-start whitespace-normal p-0 text-left text-base font-normal text-slate-400 hover:text-primary', TEXT_LINK_STYLES, className)}
    >
      {children}
    </Button>
  )
}

export default function CustomerFooter({ onOpenTerms }) {
  const { t } = useTranslation()
  return (
    <footer className="bg-[#202b3b] text-slate-200 dark:border-t dark:border-border dark:bg-card print:hidden">
      <Reveal className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <Brand
            to={CUSTOMER_ROUTES.HOME}
            label={t('customer.washgoHome')}
            className="text-white"
          />
          <p className="mt-5 text-base leading-6 text-slate-400">
            {t('customer.aSmartLaundryPlatformWithAutomatedLockersMakingEveryday')}
          </p>
          <div className="mt-6 flex gap-3">
            {socialLinks.map(({ label, icon: Icon, color }) => (
              <Button
                key={t(label)}
                size="icon"
                variant="ghost"
                className={cn('size-11 rounded-xl border bg-transparent transition-[color,background-color,border-color,box-shadow] duration-200', color)}
                aria-label={t(label)}
                tooltip={t(label)}
                onClick={showPendingContent}
              >
                <Icon className="size-5" />
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('common.services')}
          </h2>
          <ul className="mt-5 space-y-4 text-base leading-6 text-slate-400">
            {CUSTOMER_FOOTER.SERVICES.map(({ label }) => (
              <li key={t(label)}>
                <Link
                  to={CUSTOMER_ROUTES.SERVICES}
                  className={`hover:text-primary ${TEXT_LINK_STYLES}`}
                >
                  {t(label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('customer.support')}
          </h2>
          <Link
            to={`${CUSTOMER_ROUTES.HOME}#how-it-works`}
            className={`mt-5 inline-block text-base leading-6 text-slate-400 hover:text-primary ${TEXT_LINK_STYLES}`}
          >
            {t('customer.howItWorks')}
          </Link>
          <ul className="mt-4 space-y-4 text-base leading-6 text-slate-400">
            {CUSTOMER_FOOTER.SUPPORT.map((label) => (
              <li key={t(label)}>
                {label === 'common.termsOfService' ? (
                  <Button
                    variant="link"
                    onClick={onOpenTerms}
                    className={`h-auto whitespace-normal p-0 text-left text-base font-normal text-slate-400 hover:text-primary ${TEXT_LINK_STYLES}`}
                  >
                    {t(label)}
                  </Button>
                ) : (
                  <FooterPendingLink>
                    {t(label)}
                  </FooterPendingLink>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('customer.contact')}
          </h2>
          <ul className="mt-5 space-y-4 text-base leading-6 text-slate-400">
            <li className="flex items-start gap-3">
              <Phone className="mt-1 size-4 shrink-0 text-primary" />
              <FooterPendingLink>
                {CUSTOMER_FOOTER.PHONE}
              </FooterPendingLink>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-1 size-4 shrink-0 text-primary" />
              <FooterPendingLink className="break-all">
                {CUSTOMER_FOOTER.EMAIL}
              </FooterPendingLink>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 size-4 shrink-0 text-primary" />
              <FooterPendingLink>
                {t(CUSTOMER_FOOTER.ADDRESS)}
              </FooterPendingLink>
            </li>
          </ul>
        </div>
      </Reveal>
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-white/5 px-6 py-7 text-base text-slate-400 sm:flex-row lg:px-8">
        <p>
          {t('common.copyright', { year: new Date().getFullYear() })}
        </p>
        <div className="flex gap-6">
          <FooterPendingLink className="text-base">
            {t('customer.privacy')}
          </FooterPendingLink>
          <Button
            variant="link"
            onClick={onOpenTerms}
            className={`h-auto p-0 text-base font-normal text-slate-400 hover:text-primary ${TEXT_LINK_STYLES}`}
          >
            {t('customer.terms')}
          </Button>
        </div>
      </div>
    </footer>
  )
}
