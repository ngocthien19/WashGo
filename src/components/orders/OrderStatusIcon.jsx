import { createLucideIcon, Clock3, PackageCheck, Truck, WashingMachine, Wind, Layers, Wallet, BadgeCheck, DoorOpen, PackageOpen, CircleCheck, Warehouse, PackageX, PackagePlus, Undo2, CircleHelp } from 'lucide-react'

const Iron = createLucideIcon('LaundryIron', [
  ['path', { d: 'M3 17h18l-2-7H9a6 6 0 0 0-6 6v1Z', key: 'body' }],
  ['path', { d: 'M10 10V6h6l3 4M3 20h18', key: 'handle' }]
])

const icons = {
  1: Clock3, 2: PackageCheck, 3: Truck, 4: WashingMachine,
  5: Wind, 6: Iron, 7: Layers, 8: Wallet, 9: BadgeCheck,
  10: DoorOpen, 11: PackageOpen, 12: CircleCheck,
  13: Warehouse, 14: PackagePlus, 15: Undo2, 16: PackageCheck, 17: Truck, 18: PackageCheck, 19: Truck, 99: PackageX
}

export default function OrderStatusIcon({ status, ...props }) {
  const Icon = icons[status] || CircleHelp
  return (
    <Icon
      size={16}
      className="shrink-0"
      {...props}
      aria-hidden="true"
    />
  )
}
