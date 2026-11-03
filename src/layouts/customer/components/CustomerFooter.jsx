import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { CUSTOMER_FOOTER, CUSTOMER_ROUTES, TEXT_LINK_STYLES } from '~/utils/constants'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import Brand from '~/components/Brand/Brand'
import { cn } from '~/lib/utils'

const socialLinks = [
  { label: 'Facebook', icon: FaFacebookF },
  { label: 'Instagram', icon: FaInstagram },
  { label: 'TikTok', icon: FaTiktok }
]

const showPendingContent = () => toast.info('Nội dung này đang được cập nhật.')

function FooterPendingLink({ children, className }) {
  return (
    <Button
      variant="link"
      onClick={showPendingContent}
      className={cn('h-auto min-w-0 shrink justify-start whitespace-normal p-0 text-left text-sm font-normal text-slate-400 hover:text-primary', TEXT_LINK_STYLES, className)}
    >
      {children}
    </Button>
  )
}

export default function CustomerFooter() {
  return (
    <footer className="bg-[#202b3b] text-slate-200 dark:border-t dark:border-border">
      <Reveal className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <Brand
            to={CUSTOMER_ROUTES.HOME}
            label="WashGo - Trang chủ"
            className="text-white"
          />
          <p className="mt-5 text-sm leading-6 text-slate-400">
            Nền tảng giặt ủi thông minh kết hợp hệ thống locker tự động, mang lại sự tiện lợi tối đa cho người dùng bận rộn.
          </p>
          <div className="mt-6 flex gap-3">
            {socialLinks.map(({ label, icon: Icon }) => (
              <Button
                key={label}
                size="icon"
                variant="ghost"
                className="size-9 rounded-full text-white hover:bg-white/10 hover:text-primary"
                aria-label={label}
                tooltip={label}
                onClick={showPendingContent}
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-white">Dịch vụ</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-400">
            {CUSTOMER_FOOTER.SERVICES.map(({ label, serviceType }) => (
              <li key={label}>
                <Link
                  to={serviceType ? `${CUSTOMER_ROUTES.SERVICES}?serviceType=${serviceType}` : CUSTOMER_ROUTES.SERVICES}
                  className={`hover:text-primary ${TEXT_LINK_STYLES}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-white">Hỗ trợ</h2>
          <Link
            to={`${CUSTOMER_ROUTES.HOME}#how-it-works`}
            className={`mt-5 inline-block text-sm leading-6 text-slate-400 hover:text-primary ${TEXT_LINK_STYLES}`}
          >
            Hướng dẫn sử dụng
          </Link>
          <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-400">
            {CUSTOMER_FOOTER.SUPPORT.map((label) => (
              <li key={label}>
                <FooterPendingLink>
                  {label}
                </FooterPendingLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-white">Liên hệ</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-400">
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
                {CUSTOMER_FOOTER.ADDRESS}
              </FooterPendingLink>
            </li>
          </ul>
        </div>
      </Reveal>
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-white/5 px-6 py-7 text-xs text-slate-400 sm:flex-row lg:px-8">
        <p>
          {`© ${new Date().getFullYear()} WashGo. All rights reserved.`}
        </p>
        <div className="flex gap-6">
          <FooterPendingLink className="text-xs">Quyền riêng tư</FooterPendingLink>
          <FooterPendingLink className="text-xs">Điều khoản</FooterPendingLink>
        </div>
      </div>
    </footer>
  )
}
