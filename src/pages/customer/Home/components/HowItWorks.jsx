import { useTranslation } from 'react-i18next'
import { ClipboardList, PackageCheck, ScanLine, WashingMachine } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import ScrollAccent from '~/components/motion/ScrollAccent'
import { UI_MOTION } from '~/utils/config/constants'
import SectionGlow from './SectionGlow'
import stepsBackground from '~/assets/customer/laundry-steps-background.png'

const steps = [
  { icon: ClipboardList, title: 'customer.createAnOrder', description: 'customer.chooseTheServiceAndLockerThatWorkForYou' },
  { icon: ScanLine, title: 'customer.dropOff', description: 'customer.goToYourLockerOpenACompartmentAndDrop' },
  { icon: WashingMachine, title: 'customer.weDoTheLaundry', description: 'customer.trackEveryStepOfYourOrder' },
  { icon: PackageCheck, title: 'customer.pickUp', description: 'customer.payAndCollectYourFreshCleanItems' }
]

export default function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="relative isolate scroll-mt-[var(--customer-header-offset)] overflow-hidden bg-background px-4 py-20 sm:px-6 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <img
          src={stepsBackground}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-[center_60%] opacity-50 dark:opacity-30"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background/85 via-background/65 to-background/80"
      />
      <SectionGlow side="left" />
      <div className="mx-auto max-w-7xl">
        <ScrollAccent className="text-center">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('customer.laundryMadeEasyIn')}
            {' '}
            <span className="text-primary">
              {t('customer.fourSteps')}
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            {t('customer.oneLessThingToWorryAboutMoreTimeFor')}
          </p>
        </ScrollAccent>
        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="absolute left-[12%] right-[12%] top-12 hidden border-t-2 border-dashed border-primary/25 lg:block"
          />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <Reveal
                as="li"
                key={t(title)}
                delay={index * UI_MOTION.STAGGER}
                lift
                className="group rounded-3xl border border-border/70 bg-card/90 px-6 pb-8 pt-7 text-center shadow-sm transition-[border-color,box-shadow] delay-0 duration-200 ease-in-out hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transition-none"
              >
                <div className="relative mx-auto grid size-20 place-items-center rounded-[1.6rem] border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <Icon
                    size={31}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-4 border-card bg-primary text-[10px] font-bold text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold">
                  {t(title)}
                </h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  {t(description)}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
