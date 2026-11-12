import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'

export default function ClearFiltersButton({ active, onClear, className = '' }) {
  const { t } = useTranslation()
  if (!active) {
    return null
  }
  return (
    <div className={`flex justify-end ${className}`}>
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onClear}
      >
        <RotateCcw className="size-4" />
        {t('customer.clearAllFilters')}
      </Button>
    </div>
  )
}
