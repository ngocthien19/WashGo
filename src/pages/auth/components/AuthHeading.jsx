import { cn } from '~/lib/utils'

export default function AuthHeading({ icon: Icon, eyebrow, title, children, success = false, centered = false, className }) {
  return (
    <>
      {Icon && (
        <div className={cn(
          'mb-6 grid size-12 place-items-center rounded-2xl border',
          centered && 'mx-auto size-16 rounded-full',
          success
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            : 'border-primary/20 bg-primary/10 text-blue-600 dark:text-blue-300'
        )}
        >
          <Icon size={23} />
        </div>
      )}
      <div className={cn('mb-7', centered && 'text-center', className)}>
        {eyebrow && (
          <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </span>
        )}
        <h2 className={cn('mb-2.5 mt-2 break-words text-3xl font-bold leading-tight tracking-tight', centered && 'text-2xl')}>
          {title}
        </h2>
        {children && (
          <p className="text-sm leading-7 text-muted-foreground">
            {children}
          </p>
        )}
      </div>
    </>
  )
}
