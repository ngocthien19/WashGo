import { Link } from 'react-router-dom'
import logo from '~/assets/logo-washgo.svg'
import { AUTH_ROUTES, UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function AuthBrand() {
  return (
    <Link
      to={AUTH_ROUTES.LOGIN}
      className={cn(
        'flex w-fit cursor-pointer items-center gap-2 text-lg font-extrabold tracking-tight hover:opacity-80',
        UI_TRANSITIONS.OPACITY
      )}
      aria-label="WashGo - Đăng nhập"
    >
      <img
        src={logo}
        alt=""
        className="size-8"
      />
      <span>
        Wash
        <span className="text-primary">Go</span>
      </span>
    </Link>
  )
}
