import { Link } from 'react-router-dom'
import logo from '~/assets/logo-washgo.svg'
import { UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function Brand({ to, label, className, wordmarkClassName, onClick }) {
  return (
    <Link
      to={to}
      aria-label={label}
      onClick={onClick}
      className={cn('flex w-fit shrink-0 cursor-pointer items-center gap-2 text-lg font-extrabold tracking-tight hover:opacity-80', UI_TRANSITIONS.OPACITY, className)}
    >
      <img
        src={logo}
        alt=""
        className="size-8"
      />
      <span className={wordmarkClassName}>
        Wash
        <span className="text-primary">Go</span>
      </span>
    </Link>
  )
}
