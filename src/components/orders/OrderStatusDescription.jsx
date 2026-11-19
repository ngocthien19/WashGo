import { useOrderDescription } from './orderPresentation'

export default function OrderStatusDescription({ status, role }) {
  return useOrderDescription(status, role)
}
