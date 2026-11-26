import * as yup from 'yup'
import { validWeight } from './orderManagement'

export const countLines = order => order.items.filter(item => item.isWeightBased === false)
export const hasWeight = order => order.items.some(item => item.isWeightBased === true)
export const actualsSchema = order => yup.object({
  items: yup.array().of(yup.object({
    orderItemId: yup.string().required(),
    actualQuantity: yup.number().transform((value, raw) => raw === '' ? undefined : value)
      .typeError('actuals.errors.InvalidActualQuantity').required('actuals.errors.InvalidActualQuantity')
      .integer('actuals.errors.InvalidActualQuantity').min(0, 'actuals.errors.InvalidActualQuantity').max(1000, 'actuals.errors.InvalidActualQuantity')
  })).length(countLines(order).length),
  actualWeightKg: hasWeight(order)
    ? yup.string().required('actuals.errors.InvalidActualWeight').test('weight', 'actuals.errors.InvalidActualWeight', value => validWeight(value || ''))
    : yup.string().nullable(),
  note: yup.string().trim().max(500, 'actuals.errors.ActualsNoteTooLong').test('difference', 'actuals.errors.ActualsNoteRequired', (value, context) =>
    !!value || !context.parent.items?.some(item => Number(item.actualQuantity) !== countLines(order).find(line => line.id === item.orderItemId)?.quantity))
})
export const actualsInput = (values, order) => ({
  actualWeightKg: hasWeight(order) && values.actualWeightKg !== '' ? Number(values.actualWeightKg) : null,
  items: (values.items || []).map(item => ({ orderItemId: item.orderItemId, actualQuantity: item.actualQuantity === '' ? null : Number(item.actualQuantity) })),
  note: values.note?.trim() || null
})
export const actualQuantity = item => item.actualQuantity ?? item.quantity
export const actualSubTotal = item => item.actualSubTotal ?? item.subTotal

export const actualsErrorCodes = new Set(['MissingActualsLines', 'InvalidActualsLine', 'InvalidActualQuantity', 'ActualsNoteRequired', 'ActualsNoteTooLong', 'InvalidActualWeight', 'MissingWeightSnapshot', 'NoWeightService', 'EmptyActuals', 'MissingPromotionSnapshot', 'ActualsAmountOutOfRange', 'ActualsRequired', 'CombinedActualsRequired'])
