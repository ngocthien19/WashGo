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
