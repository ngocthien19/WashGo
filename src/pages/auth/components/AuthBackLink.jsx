import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '~/lib/utils'
import { UI_TRANSITIONS } from '~/utils/constants'

export default function AuthBackLink({ to, children }) {
  return (
    <Link
      to={to}
      className={cn(
        'mt-6 flex cursor-pointer items-center justify-center gap-1.5 text-xs text-orange-700 underline decoration-transparent underline-offset-4 hover:text-orange-800 hover:decoration-current dark:text-orange-300 dark:hover:text-orange-200',
        UI_TRANSITIONS.LINK
      )}
    >
      <ArrowLeft size={16} />
      {children}
    </Link>
  )
}
