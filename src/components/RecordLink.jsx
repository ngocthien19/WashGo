import { Link } from 'react-router-dom'
import { cn } from '~/lib/utils'

export default function RecordLink({ to, onClick, className, children, ...props }) {
  const styles = cn('cursor-pointer text-left text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring', className)
  return to ? (
    <Link
      to={to}
      onClick={onClick}
      className={styles}
      {...props}
    >
      {children}
    </Link>
  )
    : (
      <button
        type="button"
        onClick={onClick}
        className={styles}
        {...props}
      >
        {children}
      </button>
    )
}
