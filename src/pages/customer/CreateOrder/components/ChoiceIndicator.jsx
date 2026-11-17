import { CircleCheck, CirclePlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ChoiceIndicator({ selected }) {
  const { t } = useTranslation()
  const Icon = selected ? CircleCheck : CirclePlus
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${selected ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
    >
      <Icon className="size-4" />
      {t(selected ? 'customer.order.choiceSelected' : 'customer.order.chooseChoice')}
    </span>
  )
}
