import { ROLE_HOME_ROUTES, USER_ROLES } from '~/utils/constants'

export const normalizeRole = (role) => Object.values(USER_ROLES)
  .find((value) => value.toLowerCase() === String(role || '').trim().toLowerCase())

export const getRoleHome = (role) => ROLE_HOME_ROUTES[normalizeRole(role)] || null
