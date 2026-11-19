import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'

export const OrderRoleContext = createContext('Customer')

export function useOrderDescription(status, explicitRole) {
  const role = useContext(OrderRoleContext)
  const { t } = useTranslation()
  const key = `orderRoleDescriptions.${explicitRole || role}.${status}`
  return t(key, { defaultValue: t(`orderProgress.descriptions.${status}`, { defaultValue: t('customer.orders.recordedStep') }) })
}
