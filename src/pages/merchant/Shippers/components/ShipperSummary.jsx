import { useTranslation } from 'react-i18next'
import { Users, UserCheck, Pause, CircleCheck, Truck, WifiOff } from 'lucide-react'
import StatCard from '~/components/merchant/StatCard'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'

const cards = [
  { key: 'total', Icon: Users, edge: 'border-l-primary', color: 'bg-primary/10 text-primary' },
  { key: 'working', Icon: UserCheck, edge: 'border-l-emerald-500', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { key: 'onLeave', Icon: Pause, edge: 'border-l-amber-500', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { key: 'available', Icon: CircleCheck, edge: 'border-l-cyan-500', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  { key: 'busy', Icon: Truck, edge: 'border-l-violet-500', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  { key: 'offline', Icon: WifiOff, edge: 'border-l-slate-400', color: 'bg-muted text-muted-foreground' }
]
export default function ShipperSummary({ resource }) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('merchant.shippers.statistics')}
      aria-busy={resource.loading}
    >
      {resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {cards.map(({ key, Icon, edge, color }) => (
            <StatCard
              key={key}
              icon={Icon}
              label={t(`merchant.shippers.summary.${key}`)}
              value={resource.data[key]}
              className={edge}
              iconClassName={color}
            />
          ))}
        </div>
      )}
    </section>
  )
}
