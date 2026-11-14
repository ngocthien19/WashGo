import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Home, Umbrella } from 'lucide-react'
import Brand from '~/components/Brand/Brand'
import { Button } from '~/components/ui/button'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'

const drops = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 37 + 3) % 100}%`,
  animationDelay: `${-(index % 9) * .7}s`,
  animationDuration: `${2.8 + (index % 5) * .6}s`,
  height: `${34 + (index % 4) * 14}px`
}))

export default function NotFoundPage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t('notFound.pageTitle')
  }, [t])
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -right-32 -top-32 size-[36rem] rounded-full bg-primary/8 blur-3xl" />
        {drops.map((drop, index) => (
          <span
            key={index}
            style={drop}
            className="not-found-raindrop absolute -top-20 w-[1.5px] rounded-full bg-linear-to-b from-transparent via-primary/20 to-primary/50 dark:via-primary/10 dark:to-primary/30"
          />
        ))}
      </div>
      <div className="px-6 py-7 sm:px-10">
        <Brand
          to={CUSTOMER_ROUTES.HOME}
          label={t('customer.washgoHome')}
        />
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 pb-16 pt-8 text-center">
        <div
          aria-hidden="true"
          className="relative mb-8 flex h-52 w-full max-w-md items-center justify-center sm:h-64"
        >
          <span className="select-none text-[10rem] font-black leading-none tracking-tight text-primary/10 sm:text-[13rem]">404</span>
          <div className="absolute bottom-1 grid size-24 place-items-center rounded-full border border-primary/15 bg-card/90 text-primary shadow-lg shadow-primary/5 backdrop-blur-sm sm:size-28">
            <Umbrella
              className="size-12 -rotate-12 sm:size-14"
              strokeWidth={1.5}
            />
          </div>
        </div>
        <p className="mb-3 text-sm font-semibold tracking-widest text-primary">404 · WashGo</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('notFound.title')}
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
          {t('notFound.description')}
        </p>
        <Button
          render={<Link to={CUSTOMER_ROUTES.HOME} />}
          nativeButton={false}
          className="mt-8 h-12 gap-3 rounded-xl px-6 text-base"
        >
          <Home size={18} />
          {t('notFound.home')}
          <ArrowRight size={18} />
        </Button>
      </div>
    </main>
  )
}
