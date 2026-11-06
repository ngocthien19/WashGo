import { useTranslation } from 'react-i18next'
import { LocateFixed } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function LocationButton({ locating, onClick }) {
  const { t } = useTranslation()
  return (
    <Button
      className="h-11 rounded-full px-5 text-base"
      disabled={locating}
      onClick={onClick}
    >
      <LocateFixed size={18} />
      {locating ? t('customer.gettingYourLocation') : t('customer.useMyLocation')}
    </Button>
  )
}
