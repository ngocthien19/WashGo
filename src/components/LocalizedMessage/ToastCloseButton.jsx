import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function ToastCloseButton({ closeToast }) {
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="shrink-0 self-start text-muted-foreground"
      aria-label={t('common.closeNotification')}
      onClick={(event) => {
        event.stopPropagation()
        closeToast(true)
      }}
    >
      <X size={16} />
    </Button>
  )
}
