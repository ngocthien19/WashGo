import * as yup from 'yup'
import { ORDER_LIMITS, ORDER_PAYMENT_METHODS } from '~/utils/constants'

export const isWeightService = (service) => service.unit?.toLowerCase() === 'kg'

export const orderDetailsSchema = yup.object({
  customerNote: yup.string().trim().max(ORDER_LIMITS.NOTE_MAX, 'customer.order.noteTooLong'),
  promotionCode: yup.string().trim().max(ORDER_LIMITS.CODE_MAX, 'customer.order.codeTooLong'),
  paymentMethod: yup.number().oneOf(Object.values(ORDER_PAYMENT_METHODS), 'customer.payment.invalidMethod')
})

export const validOrderItems = (items) => items.length > 0 && items.length <= ORDER_LIMITS.MAX_SERVICES
  && new Set(items.map((item) => item.service.id)).size === items.length
  && items.every(({ service, quantity }) => service.id && Number.isInteger(quantity)
    && quantity >= 1 && quantity <= ORDER_LIMITS.MAX_QUANTITY && (!isWeightService(service) || quantity === 1))

export const toOrderItems = (items) => items.map(({ service, quantity }) => ({ serviceId: service.id, quantity }))

export const toCreateOrder = ({ items, locker, box, customerNote, promotionCode, paymentMethod = ORDER_PAYMENT_METHODS.CASH }) => ({
  lockerId: locker.id,
  boxId: box.id,
  returnLockerId: locker.id,
  paymentMethod,
  customerNote: customerNote?.trim() || null,
  promotionCode: promotionCode?.trim() || null,
  items: toOrderItems(items)
})
