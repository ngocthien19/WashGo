import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, CircleCheck, Wrench, Power } from 'lucide-react'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'

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
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {cards.map(([key, Icon, edge, color]) => (
            <div
              key={key}
              className={`rounded-2xl border border-border border-l-4 bg-card p-5 shadow-sm ${edge}`}
            >
              <span className={`mb-3 grid size-11 place-items-center rounded-xl ${color}`}>
                <Icon size={22} />
              </span>
              <h2 className="text-sm text-muted-foreground">
                {t(`merchant.lockers.summary.${key}`)}
              </h2>
              <p className="mt-2 text-3xl font-bold">
                <AnimatedNumber value={resource.data[key]} />
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
