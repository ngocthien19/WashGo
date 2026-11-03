import { AUTH_ROUTES } from '~/utils/constants'
import Brand from '~/components/Brand/Brand'

export default function AuthBrand() {
  return (
    <Brand
      to={AUTH_ROUTES.LOGIN}
      label="WashGo - Đăng nhập"
    />
  )
}
