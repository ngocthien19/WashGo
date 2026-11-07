import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, CircleCheck, Wrench, Power, DoorOpen, Package, Clock } from 'lucide-react'
import StatCard from '~/components/merchant/StatCard'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'

const boxStates = [
  { key: 'totalBoxes', Icon: PanelsTopLeft, color: 'text-primary', background: 'bg-primary/8' },
  { key: 'availableBoxes', status: 1, Icon: DoorOpen, color: 'text-emerald-600 dark:text-emerald-400', background: 'bg-emerald-500/10' },
  { key: 'occupiedBoxes', status: 2, Icon: Package, color: 'text-red-600 dark:text-red-400', background: 'bg-red-500/10' },
  { key: 'reservedBoxes', status: 3, Icon: Clock, color: 'text-amber-600 dark:text-amber-400', background: 'bg-amber-500/10' },
  { key: 'maintenanceBoxes', status: 4, Icon: Wrench, color: 'text-slate-500 dark:text-slate-400', background: 'bg-slate-500/10' }
]

const cards = [
  ['total', PanelsTopLeft, 'border-l-primary', 'bg-primary/10 text-primary'],
  ['active', CircleCheck, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
  ['maintenance', Wrench, 'border-l-amber-500', 'bg-amber-500/10 text-amber-700 dark:text-amber-300'],
  ['inactive', Power, 'border-l-slate-400', 'bg-muted text-muted-foreground']
]
export default function LockerSummary({ resource }) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('merchant.lockers.statistics')}
      aria-busy={resource.loading}
    >
      {resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {cards.map(([key, Icon, edge, color]) => (
              <StatCard
                key={key}
                icon={Icon}
                label={t(`merchant.lockers.summary.${key}`)}
                value={resource.data[key]}
                className={edge}
                iconClassName={color}
              />
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-y-5 rounded-2xl border border-border bg-card py-5 sm:grid-cols-3 xl:grid-cols-5">
            {boxStates.map(({ key, status, Icon, color, background }, index) => (
              <div
                key={key}
                className={`flex min-w-0 items-center gap-3 px-5 ${index === 0 ? 'col-span-2 border-b border-border pb-4 sm:col-span-1 sm:border-b-0 sm:pb-0' : ''} xl:border-r xl:border-border xl:last:border-r-0`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${color} ${background}`}>
                  <Icon
                    size={20}
                    aria-hidden="true"
                  />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t(status ? `merchant.lockers.boxStates.${status}` : 'merchant.lockers.totalBoxes')}
                  </dt>
                  <dd className={`text-2xl font-bold leading-none tabular-nums ${color}`}>
                    <AnimatedNumber value={resource.data[key]} />
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}
