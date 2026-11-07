import { ORDER_STATUSES } from '~/utils/constants'

export const statusTextColors = {
  [ORDER_STATUSES.PENDING]: 'text-slate-600 dark:text-slate-300',
  [ORDER_STATUSES.DEPOSITED]: 'text-sky-700 dark:text-sky-300',
  [ORDER_STATUSES.COLLECTED]: 'text-cyan-700 dark:text-cyan-300',
  [ORDER_STATUSES.WASHING]: 'text-blue-700 dark:text-blue-300',
  [ORDER_STATUSES.DRYING]: 'text-indigo-700 dark:text-indigo-300',
  [ORDER_STATUSES.IRONING]: 'text-purple-700 dark:text-purple-300',
  [ORDER_STATUSES.FOLDING]: 'text-fuchsia-700 dark:text-fuchsia-300',
  [ORDER_STATUSES.AWAITING_PAYMENT]: 'text-amber-700 dark:text-amber-300',
  [ORDER_STATUSES.PAID]: 'text-emerald-700 dark:text-emerald-300',
  [ORDER_STATUSES.READY_TO_RETURN]: 'text-emerald-700 dark:text-emerald-300',
  [ORDER_STATUSES.RETURNED]: 'text-teal-700 dark:text-teal-300',
  [ORDER_STATUSES.COMPLETED]: 'text-emerald-700 dark:text-emerald-300',
  [ORDER_STATUSES.MOVED_TO_STORAGE]: 'text-orange-700 dark:text-orange-300',
  [ORDER_STATUSES.CANCELLED]: 'text-red-700 dark:text-red-300'
}
