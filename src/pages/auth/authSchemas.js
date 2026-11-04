import * as yup from 'yup'
import { AUTH_LIMITS, OTP_CONFIG } from '~/utils/constants'
import { normalizePhone } from '~/utils/formats'

const email = yup.string()
  .trim()
  .lowercase()
  .email('auth.pleaseEnterAValidEmailAddress')
  .max(AUTH_LIMITS.EMAIL_MAX, 'auth.emailMustBeAtMostCharacters')
  .required('auth.pleaseEnterYourEmail')

const password = yup.string()
  .required('auth.pleaseEnterYourPassword')
  .min(AUTH_LIMITS.PASSWORD_MIN, 'auth.passwordMustHaveAtLeastCharacters')
  .max(AUTH_LIMITS.PASSWORD_MAX, 'auth.passwordMustBeAtMostCharacters')
  .matches(/\p{Lu}/u, 'auth.includeAtLeastOneUppercaseLetter')
  .matches(/\p{Ll}/u, 'auth.includeAtLeastOneLowercaseLetter')
  .matches(/\p{Nd}/u, 'auth.includeAtLeastOneNumber')

export const loginSchema = yup.object({
  email,
  password: yup.string().required('auth.pleaseEnterYourPassword')
})

export const forgotPasswordSchema = yup.object({ email })

export const registerSchema = yup.object({
  fullName: yup.string()
    .trim()
    .min(AUTH_LIMITS.NAME_MIN, 'auth.fullNameMustHaveAtLeastCharacters')
    .max(AUTH_LIMITS.NAME_MAX, 'auth.fullNameMustBeAtMostCharacters')
    .required('auth.pleaseEnterYourFullName'),
  email,
  phone: yup.string()
    .trim()
    .required('auth.pleaseEnterYourPhoneNumber')
    .matches(/^\+?[\d\s().-]+$/, 'auth.pleaseEnterAValidPhoneNumber')
    .test('phone', 'auth.phoneNumberMustContainDigits', (value) => {
      const digits = normalizePhone(value)
      return digits.length >= AUTH_LIMITS.PHONE_MIN && digits.length <= AUTH_LIMITS.PHONE_MAX
    }),
  password,
  confirmPassword: yup.string()
    .required('auth.pleaseConfirmYourPassword')
    .oneOf([yup.ref('password')], 'auth.thePasswordsDoNotMatch')
})

export const otpSchema = yup.object({
  code: yup.string()
    .required('auth.pleaseEnterTheOtp')
    .matches(new RegExp(`^\\d{${OTP_CONFIG.CODE_LENGTH}}$`), 'auth.theOtpMustContainDigits')
})

export const resetPasswordSchema = yup.object({
  newPassword: password,
  confirmNewPassword: yup.string()
    .required('auth.pleaseConfirmYourPassword')
    .oneOf([yup.ref('newPassword')], 'auth.thePasswordsDoNotMatch')
})
