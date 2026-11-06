import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function OrderPin({ pin, label = 'customer.order.depositPin' }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  if (!pin) {
    return null
  }
  return (
    <div className="rounded-2xl border border-border bg-muted/15 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="size-4 text-primary" />
        {t(label)}
      </p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="break-all font-mono text-2xl tracking-[0.25em]">
          {visible ? pin : '••••••'}
        </span>
        <Button
          size="icon-lg"
          variant="secondary"
          aria-label={t(label === 'customer.order.depositPin'
            ? visible ? 'customer.order.hidePin' : 'customer.order.showPin'
            : visible ? 'customer.orders.hidePickupPin' : 'customer.orders.showPickupPin')}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  )
}
