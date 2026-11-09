import AnimatedNumber from '~/components/motion/AnimatedNumber'
import { cn } from '~/lib/utils'

export default function StatCard({ icon: Icon, label, value, className, iconClassName, children, ...props }) {
  return (
    <section
      className={cn('flex min-w-0 items-center gap-3 rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm', className)}
      {...props}
    >
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', iconClassName)}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium leading-snug text-foreground">
          {label}
        </h2>
        <p className="mt-1 break-words text-2xl font-bold tabular-nums">
          {Number.isFinite(value) ? <AnimatedNumber value={value} /> : value ?? '—'}
        </p>
        {children}
      </div>
    </section>
  )
}
