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
  LOCKERS: '/customer/lockers',
  CREATE_ORDER: '/customer/orders/new',
  PROFILE: '/customer/profile'
}

export const CUSTOMER_NAVIGATION = [
  { label: 'common.home', href: CUSTOMER_ROUTES.HOME },
  { label: 'common.createAnOrder', href: CUSTOMER_ROUTES.CREATE_ORDER },
  { label: 'common.myOrders', pending: true },
  { label: 'common.services', href: CUSTOMER_ROUTES.SERVICES },
  { label: 'common.lockers', href: CUSTOMER_ROUTES.LOCKERS }
]

export const CUSTOMER_API_ENDPOINTS = {
  ORDERS: '/wash-order',
  ORDER_QUOTE: '/wash-order/apply-voucher',
  PROFILE: '/customer/me',
  SERVICES: '/customer/services',
  SERVICE_FILTER: '/customer/services/filter',
  LOCKERS: '/customer/lockers'
}

export const ORDER_LIMITS = { MAX_SERVICES: 30, MAX_QUANTITY: 1000, NOTE_MAX: 500, CODE_MAX: 50 }
export const ORDER_PAYMENT_METHODS = { CASH: 1 }
export const ORDER_PANEL_HEADER_STYLES = 'flex items-center gap-3 border-b border-border/60 bg-primary/5 p-5'

// Order choices deliberately keep a light blue surface in both themes.
export const ORDER_CHOICE_STYLES = 'transition-[background-color,border-color,box-shadow,color] delay-0 duration-200 ease-in-out motion-reduce:transition-none [&&:is(:hover:not([data-hover-suppressed=true]),[aria-pressed=true],[data-selected=true])]:border-blue-400 [&&:is(:hover:not([data-hover-suppressed=true]),[aria-pressed=true],[data-selected=true])]:bg-blue-50 [&&:is(:hover:not([data-hover-suppressed=true]),[aria-pressed=true],[data-selected=true])]:text-slate-900 [&&:is(:hover:not([data-hover-suppressed=true]),[aria-pressed=true],[data-selected=true])_.order-choice-muted]:text-slate-600 [&&:is(:hover:not([data-hover-suppressed=true]),[aria-pressed=true],[data-selected=true])_.order-choice-primary]:text-blue-600 [&&:is(:hover:not([data-hover-suppressed=true]),[aria-pressed=true],[data-selected=true])_.order-choice-availability]:text-emerald-700'

export const IMAGE_UPLOAD = {
  ENDPOINT: '/files/images',
  MAX_BYTES: 5 * 1024 * 1024,
  MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp']
}

export const PROFILE_LIMITS = { ADDRESS_MAX: 500, AREA_MAX: 100, PHONE_DISPLAY_MAX: 30 }

export const ADDRESS_MAP = {
  REVERSE_URL: import.meta.env.VITE_REVERSE_GEOCODING_URL || 'https://photon.komoot.io/reverse',
  DEFAULT_CENTER: { latitude: 10.7769, longitude: 106.7009 },
  INITIAL_ZOOM: 13,
  REVERSE_RADIUS_KM: 0.1,
  DEBOUNCE_MS: 450,
  REQUEST_INTERVAL_MS: 1000,
  REQUEST_TIMEOUT_MS: 10000,
  CACHE_LIMIT: 80,
  COORDINATE_PRECISION: 5
}

export const LOCKER_MAP = {
  TILE_URL: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ZOOM: 15,
  MAX_ZOOM: 18,
  ACTIVE_COLOR: '#2563eb',
  USER_COLOR: '#0891b2',
  TILE_TIMEOUT_MS: 12000,
  LOCATION_TIMEOUT_MS: 10000,
  LOCATION_MAX_AGE_MS: 60000
}

export const EARTH_RADIUS_KM = 6371

export const LOCKER_SLOT_SIZES = { 1: 'common.small', 2: 'common.standard', 3: 'common.large' }

export const SERVICE_TYPES = [
  { value: '', label: 'common.all' },
  { value: '1', label: 'common.standardWash' },
  { value: '2', label: 'common.dryCleaning' },
  { value: '3', label: 'common.ironing' },
  { value: '4', label: 'common.blanketWash' },
  { value: '5', label: 'common.shoeCleaning' }
]

export const CUSTOMER_CATALOG = {
  PAGE_SIZE: 6,
  FEATURED_LIMIT: 3,
  INITIAL_PAGE: 1
}

export const SERVICE_SORT_OPTIONS = [
  { value: 'name-asc', label: 'customer.nameAZ', sortBy: [{ field: 'Name', isDescending: false }, { field: 'UnitPrice', isDescending: false }] },
  { value: 'name-desc', label: 'customer.serviceCatalog.nameZA', sortBy: [{ field: 'Name', isDescending: true }, { field: 'UnitPrice', isDescending: false }] },
  { value: 'price-asc', label: 'customer.serviceCatalog.priceLowHigh', sortBy: [{ field: 'UnitPrice', isDescending: false }, { field: 'Name', isDescending: false }] },
  { value: 'price-desc', label: 'customer.serviceCatalog.priceHighLow', sortBy: [{ field: 'UnitPrice', isDescending: true }, { field: 'Name', isDescending: false }] }
]

// Inclusive API bounds; UnitPrice is stored with two decimal places in the backend.
export const SERVICE_PRICE_RANGES = [
  { value: '', label: 'common.all', minPrice: '', maxPrice: '' },
  { value: 'under-30000', label: 'customer.serviceCatalog.under30000', minPrice: '', maxPrice: '29999.99' },
  { value: '30000-50000', label: 'customer.serviceCatalog.from30000To50000', minPrice: '30000', maxPrice: '50000' },
  { value: '50000-100000', label: 'customer.serviceCatalog.from50000To100000', minPrice: '50000', maxPrice: '100000' },
  { value: 'over-100000', label: 'customer.serviceCatalog.over100000', minPrice: '100000.01', maxPrice: '' }
]

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
    { label: 'common.everydayWashDry', serviceType: '1' },
    { label: 'common.premiumDryCleaning', serviceType: '2' },
    { label: 'common.professionalIroning', serviceType: '3' },
    { label: 'common.businessPackages', serviceType: '' }
  ],
  SUPPORT: ['common.privacyPolicy', 'common.termsOfService', 'common.frequentlyAskedQuestions'],
  PHONE: '1900 123 456',
  EMAIL: 'support@washgo.vn',
  ADDRESS: 'common.contactAddress'
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

export const CHOICE_ITEM_STYLES = 'data-[selected]:bg-primary/10 data-[selected]:font-normal data-[selected]:text-primary data-[selected]:data-highlighted:bg-primary/15 aria-[current=true]:bg-primary/10 aria-[current=true]:font-normal aria-[current=true]:text-primary aria-[current=true]:data-highlighted:bg-primary/15'

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

// Backend response used to select the Google back-office endpoint.
export const GOOGLE_ADMIN_PORTAL_MESSAGE = 'Vui lòng dùng cổng quản trị.'

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
}

export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export const DEFAULT_LANGUAGE = 'vi'
export const LANGUAGE_OPTIONS = [
  { value: 'vi', label: 'Tiếng Việt', locale: 'vi-VN' },
  { value: 'en', label: 'English', locale: 'en-US' }
]

export const PASSWORD_REQUIREMENTS_HINT = 'common.charactersWithUppercaseAndLowercaseLettersAndNumbers'

export const GOOGLE_SIGN_IN = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  SCRIPT_URL: 'https://accounts.google.com/gsi/client',
  LOAD_TIMEOUT_MS: 15000,
  BUTTON_MAX_WIDTH: 400
}
