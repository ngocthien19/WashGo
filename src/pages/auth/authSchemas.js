import * as yup from 'yup'
import { AUTH_LIMITS, OTP_CONFIG } from '~/utils/constants'
import { normalizePhone } from '~/utils/formats'

const email = yup.string()
  .trim()
  .lowercase()
  .email('Email không đúng định dạng.')
  .max(AUTH_LIMITS.EMAIL_MAX, `Email tối đa ${AUTH_LIMITS.EMAIL_MAX} ký tự.`)
  .required('Vui lòng nhập email.')

const password = yup.string()
  .required('Vui lòng nhập mật khẩu.')
  .min(AUTH_LIMITS.PASSWORD_MIN, `Mật khẩu cần ít nhất ${AUTH_LIMITS.PASSWORD_MIN} ký tự.`)
  .max(AUTH_LIMITS.PASSWORD_MAX, `Mật khẩu tối đa ${AUTH_LIMITS.PASSWORD_MAX} ký tự.`)
  .matches(/\p{Lu}/u, 'Cần ít nhất một chữ hoa.')
  .matches(/\p{Ll}/u, 'Cần ít nhất một chữ thường.')
  .matches(/\p{Nd}/u, 'Cần ít nhất một chữ số.')

export const loginSchema = yup.object({
  email,
  password: yup.string().required('Vui lòng nhập mật khẩu.')
})

export const forgotPasswordSchema = yup.object({ email })

export const registerSchema = yup.object({
  fullName: yup.string()
    .trim()
    .min(AUTH_LIMITS.NAME_MIN, `Họ tên cần ít nhất ${AUTH_LIMITS.NAME_MIN} ký tự.`)
    .max(AUTH_LIMITS.NAME_MAX, `Họ tên tối đa ${AUTH_LIMITS.NAME_MAX} ký tự.`)
    .required('Vui lòng nhập họ tên.'),
  email,
  phone: yup.string()
    .trim()
    .required('Vui lòng nhập số điện thoại.')
    .matches(/^\+?[\d\s().-]+$/, 'Số điện thoại không hợp lệ.')
    .test('phone', `Số điện thoại cần từ ${AUTH_LIMITS.PHONE_MIN} đến ${AUTH_LIMITS.PHONE_MAX} chữ số.`, (value) => {
      const digits = normalizePhone(value)
      return digits.length >= AUTH_LIMITS.PHONE_MIN && digits.length <= AUTH_LIMITS.PHONE_MAX
    }),
  password,
  confirmPassword: yup.string()
    .required('Vui lòng xác nhận mật khẩu.')
    .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp.')
})

export const otpSchema = yup.object({
  code: yup.string()
    .required('Vui lòng nhập mã OTP.')
    .matches(new RegExp(`^\\d{${OTP_CONFIG.CODE_LENGTH}}$`), `Mã OTP gồm ${OTP_CONFIG.CODE_LENGTH} chữ số.`)
})

export const resetPasswordSchema = yup.object({
  newPassword: password,
  confirmNewPassword: yup.string()
    .required('Vui lòng xác nhận mật khẩu.')
    .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp.')
})
