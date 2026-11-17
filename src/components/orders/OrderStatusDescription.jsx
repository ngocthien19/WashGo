import { useTranslation } from 'react-i18next'

export default function OrderStatusDescription({ status }) {
  const { t } = useTranslation()
  return t(`orderProgress.descriptions.${status}`, { defaultValue: t('customer.orders.recordedStep') })
}
