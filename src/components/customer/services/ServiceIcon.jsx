import { Footprints, Shirt, Sparkles, Waves, Wind } from 'lucide-react'

const icons = { 1: Shirt, 2: Wind, 3: Sparkles, 4: Waves, 5: Footprints }

export default function ServiceIcon({ type, className = 'size-6' }) {
  const Icon = icons[type] || Shirt
  return (
    <Icon
      className={className}
      strokeWidth={1.7}
      aria-hidden="true"
    />
  )
}
