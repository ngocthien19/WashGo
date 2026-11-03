export const AUTH_ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_OTP: '/verify-otp',
  RESET_PASSWORD: '/reset-password',
  ACCOUNT: '/account'
}

export const USER_ROLES = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
  MERCHANT: 'Merchant',
  SHIPPER: 'Shipper'
}

export const ROLE_HOME_ROUTES = {
  [USER_ROLES.CUSTOMER]: '/customer',
  [USER_ROLES.ADMIN]: '/admin',
  [USER_ROLES.MERCHANT]: '/merchant',
  [USER_ROLES.SHIPPER]: '/shipper'
}

export const CUSTOMER_ROUTES = {
  HOME: ROLE_HOME_ROUTES[USER_ROLES.CUSTOMER],
  SERVICES: '/customer/services',
  LOCKERS: '/customer/lockers'
}

export const CUSTOMER_NAVIGATION = [
  { label: 'Trang chủ', href: CUSTOMER_ROUTES.HOME },
  { label: 'Tạo đơn hàng', pending: true },
  { label: 'Đơn hàng của tôi', pending: true },
  { label: 'Dịch vụ', href: CUSTOMER_ROUTES.SERVICES },
  { label: 'Locker', href: CUSTOMER_ROUTES.LOCKERS }
]

export const CUSTOMER_API_ENDPOINTS = {
  SERVICES: '/customer/services',
  LOCKERS: '/customer/lockers'
}

export const LOCKER_MAP = {
  TILE_URL: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ZOOM: 15,
  MAX_ZOOM: 18,
  ACTIVE_COLOR: '#ff7a45',
  USER_COLOR: '#2563eb',
  TILE_TIMEOUT_MS: 12000,
  LOCATION_TIMEOUT_MS: 10000,
  LOCATION_MAX_AGE_MS: 60000
}

export const EARTH_RADIUS_KM = 6371

export const LOCKER_SLOT_SIZES = { 1: 'Nhỏ', 2: 'Tiêu chuẩn', 3: 'Lớn' }

export const SERVICE_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: '1', label: 'Giặt thường' },
  { value: '2', label: 'Giặt khô' },
  { value: '3', label: 'Ủi đồ' },
  { value: '4', label: 'Giặt chăn' },
  { value: '5', label: 'Vệ sinh giày' }
]

export const CUSTOMER_CATALOG = {
  PAGE_SIZE: 6,
  FEATURED_LIMIT: 3,
  INITIAL_PAGE: 1
}

export const LOCKER_AREA_PAGE_SIZE = 100

export const UI_MOTION = {
  DURATION: 0.35,
  STAGGER: 0.06,
  EASE: [0.22, 1, 0.36, 1],
  TOOLTIP_DELAY_MS: 0
}

export const HERO_MOTION = {
  OFFSET: 48,
  DURATION: 0.6
}

// Display placeholders from the reference; replace when official content is available.
export const CUSTOMER_FOOTER = {
  SERVICES: [
    { label: 'Giặt sấy thông dụng', serviceType: '1' },
    { label: 'Giặt hấp cao cấp', serviceType: '2' },
    { label: 'Ủi phẳng chuyên sâu', serviceType: '3' },
    { label: 'Combo doanh nghiệp', serviceType: '' }
  ],
  SUPPORT: ['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Câu hỏi thường gặp'],
  PHONE: '1900 123 456',
  EMAIL: 'support@washgo.vn',
  ADDRESS: '123 Đường Số 7, Phường Tân Kiểng, Quận 7, TP. HCM'
}

export const OTP_PURPOSE = {
  REGISTER: 1,
  FORGOT_PASSWORD: 2
}

export const AUTH_LIMITS = {
  EMAIL_MAX: 100,
  NAME_MIN: 2,
  NAME_MAX: 100,
  PHONE_MIN: 9,
  PHONE_MAX: 11,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128
}

export const OTP_CONFIG = {
  CODE_LENGTH: 6,
  VALIDITY_MS: 5 * 60 * 1000,
  RESEND_DELAY_MS: 60 * 1000
}

export const API_TIMEOUT_MS = 30 * 1000

export const UI_TRANSITIONS = {
  BUTTON: 'transition-[color,background-color,border-color,box-shadow,opacity,translate,text-decoration-color] delay-0 duration-200 ease-in-out motion-reduce:transition-none',
  LINK: 'transition-[color,text-decoration-color] delay-0 duration-200 ease-in-out motion-reduce:transition-none',
  INPUT: 'transition-[color,background-color,border-color,box-shadow] delay-0 duration-200 ease-in-out motion-reduce:transition-none',
  OPACITY: 'transition-opacity delay-0 duration-200 ease-in-out motion-reduce:transition-none',
  ICON: 'transition-transform delay-0 duration-150 ease-out motion-reduce:transition-none'
}

export const TEXT_LINK_STYLES = `underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:decoration-current ${UI_TRANSITIONS.LINK}`

export const AUTH_API_ENDPOINTS = {
  LOGIN: '/auth/login',
  GOOGLE_LOGIN: '/auth/google',
  GOOGLE_ADMIN_LOGIN: '/auth/google/admin',
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  REFRESH_TOKEN: '/auth/refresh-token',
  ME: '/auth/me',
  LOGOUT: '/auth/logout'
}

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
}

export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export const PASSWORD_REQUIREMENTS_HINT = `${AUTH_LIMITS.PASSWORD_MIN}–${AUTH_LIMITS.PASSWORD_MAX} ký tự, gồm chữ hoa, chữ thường và số.`

export const GOOGLE_SIGN_IN = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  SCRIPT_URL: 'https://accounts.google.com/gsi/client',
  LOAD_TIMEOUT_MS: 15000,
  BUTTON_MAX_WIDTH: 400
}
