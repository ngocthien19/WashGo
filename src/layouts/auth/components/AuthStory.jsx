import { Clock3, ShieldCheck, Sparkles } from 'lucide-react'
import AuthIllustration from './AuthIllustration'
import AuthBrand from '~/pages/auth/components/AuthBrand'

const benefits = [
  { icon: Clock3, label: 'Tiện lợi 24/7' },
  { icon: ShieldCheck, label: 'An toàn, bảo mật' },
  { icon: Sparkles, label: 'Sạch như ý' }
]

export default function AuthStory() {
  return (
    <aside className="relative hidden h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-primary/10 px-8 py-10 md:flex lg:px-14 xl:px-20 [@media(max-height:800px)]:py-6">
      <AuthBrand />
      <div className="my-auto w-full max-w-xl self-center py-10 [@media(max-height:800px)]:py-4">
        <h1 className="mb-4 mt-5 text-[27px] font-bold leading-snug tracking-tight lg:text-4xl [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:text-2xl">
          Thêm thời gian sống.
          <br />
          <span className="text-orange-600 dark:text-orange-300">Bớt chuyện giặt giũ.</span>
        </h1>
        <p className="text-sm leading-7 text-muted-foreground [@media(max-height:650px)]:hidden">
          Một chút tiện lợi mỗi ngày.
          <br />
          Gửi đồ vào locker, để WashGo lo phần còn lại.
        </p>
        <AuthIllustration />
        <div className="flex flex-wrap justify-between gap-3 border-t border-primary/20 pt-6 [@media(max-height:650px)]:hidden">
          {benefits.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-[11px] text-orange-900/70 dark:text-orange-200/80"
            >
              <Icon size={17} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
