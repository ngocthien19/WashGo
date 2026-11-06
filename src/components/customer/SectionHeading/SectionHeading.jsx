import { cn } from '~/lib/utils'

export default function SectionHeading({ id, title, description, descriptionClassName, icon: Icon, as: Heading = 'h2' }) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm sm:size-14">
        <Icon
          className="size-6 sm:size-7"
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <Heading
          id={id}
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {title}
        </Heading>
        <p className={cn('mt-3 max-w-2xl text-sm leading-7 text-muted-foreground', descriptionClassName)}>
          {description}
        </p>
      </div>
    </div>
  )
}
