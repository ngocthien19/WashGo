import { Bell, PackagePlus, PackageCheck, Truck, WashingMachine, CreditCard, CircleDollarSign, CircleX, DoorOpen, CircleCheck, Ban, Warehouse, MessageSquareWarning, Clock, ReceiptText } from 'lucide-react'
import { cn } from '~/lib/utils'

// Follow the backend NotificationType enum, never infer types from message text.
const types = {
  1: [PackagePlus, 'blue'], 2: [PackageCheck, 'teal'], 3: [Truck, 'indigo'],
  4: [WashingMachine, 'sky'], 5: [CreditCard, 'amber'], 6: [CircleDollarSign, 'emerald'],
  7: [CircleX, 'rose'], 8: [DoorOpen, 'teal'], 9: [CircleCheck, 'emerald'],
  10: [Ban, 'rose'], 11: [Warehouse, 'amber'], 12: [MessageSquareWarning, 'violet'],
  13: [Clock, 'amber'], 14: [Clock, 'teal'], 15: [ReceiptText, 'rose'],
  16: [Clock, 'rose'], 17: [MessageSquareWarning, 'violet'],
  20: [PackagePlus, 'blue'], 21: [Clock, 'amber'], 22: [Clock, 'rose'],
  23: [Warehouse, 'amber'], 24: [ReceiptText, 'blue'], 25: [CircleDollarSign, 'emerald'],
  26: [CircleCheck, 'violet'], 27: [CircleCheck, 'violet'], 29: [Bell, 'amber'],
  30: [Truck, 'blue'], 31: [Truck, 'teal'], 32: [Truck, 'emerald'],
  33: [Clock, 'amber'], 34: [Clock, 'amber'], 40: [MessageSquareWarning, 'rose'],
  41: [CircleDollarSign, 'amber'], 42: [CircleCheck, 'violet'],
  43: [PackageCheck, 'teal'], 44: [CircleCheck, 'emerald'], 45: [Clock, 'rose'],
  46: [ReceiptText, 'violet'], 47: [Bell, 'blue']
}
const colors = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
}
export default function NotificationIcon({ type, className }) {
  const [Icon, color] = types[type] || [Bell, 'blue']
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-10 shrink-0 place-items-center rounded-2xl', colors[color], className)}
    >
      <Icon size={20} />
    </span>
  )
}
