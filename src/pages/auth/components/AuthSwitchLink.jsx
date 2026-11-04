import { Link } from 'react-router-dom'
import { cn } from '~/lib/utils'
import { UI_TRANSITIONS } from '~/utils/constants'

export default function AuthSwitchLink({ to, prompt, children }) {
  return (
    <p className="my-6 text-center text-xs text-muted-foreground">
      {prompt}
      {' '}
      <Link
        to={to}
        className={cn(
          'ml-1 cursor-pointer font-semibold text-blue-700 underline decoration-transparent underline-offset-4 hover:text-blue-800 hover:decoration-current dark:text-blue-300 dark:hover:text-blue-200',
          UI_TRANSITIONS.LINK
        )}
      >
        {children}
      </Link>
    </p>
  )
}
