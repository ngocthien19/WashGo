import { useTranslation } from 'react-i18next'

export default function OrderItemActuals({ item }) {
  const { t } = useTranslation()
  if (item.actualQuantity == null) {
    return null
  }
  const unit = t(`actuals.units.${['item', 'pair', 'kg'].includes(item.unitSnapshot) ? item.unitSnapshot : 'unknown'}`)
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {t('actuals.ordered')}
      :
      {item.quantity}
      {' '}
      {unit}
      <span
        className="mx-2"
        aria-hidden="true"
      >
        ·
      </span>
      <span className="font-medium text-foreground">
        {t('actuals.actual')}
        :
        {' '}
        {item.actualQuantity}
        {' '}
        {unit}
      </span>
    </p>
  )
}
