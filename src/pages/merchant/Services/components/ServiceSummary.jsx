import { useTranslation } from 'react-i18next'
import { Shirt, CircleCheck, Power, Clock, BadgeCheck, CircleX } from 'lucide-react'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'

const cards = [['total', Shirt, 'primary'], ['active', CircleCheck, 'emerald'], ['inactive', Power, 'slate'], ['pending', Clock, 'amber'], ['approved', BadgeCheck, 'cyan'], ['rejected', CircleX, 'red']]
const colors = {
  primary: 'border-l-primary [&_svg]:text-primary', emerald: 'border-l-emerald-500 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-300',
  slate: 'border-l-slate-400 [&_svg]:text-muted-foreground', amber: 'border-l-amber-500 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-300',
  cyan: 'border-l-cyan-500 [&_svg]:text-cyan-600 dark:[&_svg]:text-cyan-300', red: 'border-l-red-500 [&_svg]:text-red-600 dark:[&_svg]:text-red-300'
}
export default function ServiceSummary({ resource }) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('merchant.services.statistics')}
      aria-busy={resource.loading}
    >
      {resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {cards.map(([key, Icon, color]) => (
            <div
              key={key}
              className={`rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm ${colors[color]}`}
            >
              <span className="mb-3 grid size-10 place-items-center rounded-xl bg-muted/40">
                <Icon size={21} />
              </span>
              <h2 className="text-sm text-muted-foreground">
                {t(`merchant.services.summary.${key}`)}
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
