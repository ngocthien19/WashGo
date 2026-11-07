import { useTranslation } from 'react-i18next'
import { Package, Truck, WashingMachine, Wallet, DoorOpen, CircleCheck, Warehouse, CircleX } from 'lucide-react'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { groupOrders } from '~/utils/orderGroups'

const styles = {
  total: [Package, 'border-l-primary', 'bg-primary/10 text-primary'],
  incoming: [Truck, 'border-l-blue-500', 'bg-blue-500/10 text-blue-600 dark:text-blue-300'],
  processing: [WashingMachine, 'border-l-violet-500', 'bg-violet-500/10 text-violet-600 dark:text-violet-300'],
  payment: [Wallet, 'border-l-amber-500', 'bg-amber-500/10 text-amber-700 dark:text-amber-300'],
  pickup: [DoorOpen, 'border-l-cyan-500', 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'],
  completed: [CircleCheck, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
  storage: [Warehouse, 'border-l-orange-500', 'bg-orange-500/10 text-orange-700 dark:text-orange-300'],
  cancelled: [CircleX, 'border-l-red-500', 'bg-red-500/10 text-red-600 dark:text-red-300']
}
export default function OrderSummary({ resource }) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('merchant.orders.statistics')}
      aria-busy={resource.loading}
      className="space-y-3"
    >
      {resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ key: 'total', value: resource.data.total }, ...groupOrders(resource.data.counts)].map(({ key, value }) => {
            const [Icon, edge, color] = styles[key]
            return (
              <section
                key={key}
                className={`flex items-center gap-4 rounded-2xl border border-border border-l-4 bg-card p-5 shadow-sm ${edge}`}
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${color}`}>
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm text-muted-foreground">
                    {t(key === 'total' ? 'merchant.totalOrders' : `merchant.groups.${key}`)}
                  </h2>
                  <p className="mt-2 text-3xl font-bold">
                    <AnimatedNumber value={value} />
                  </p>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
