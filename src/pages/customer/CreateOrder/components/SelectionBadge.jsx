import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'

export default function SelectionBadge({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('pointer-events-none absolute -right-2 -top-2 z-20 grid size-6 place-items-center rounded-full border-2 border-card bg-blue-600 text-white shadow-sm', className)}
    >
      <Check className="size-3.5" />
    </span>
  )
}
