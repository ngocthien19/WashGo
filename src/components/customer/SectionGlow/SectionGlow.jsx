import { cn } from '~/lib/utils'

export default function SectionGlow({ side = 'left', className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute -top-28 -z-10 size-96 rounded-full bg-primary/7 blur-3xl sm:size-[30rem]',
        side === 'left' ? '-left-36' : '-right-36', className)}
    />
  )
}
