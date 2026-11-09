import * as yup from 'yup'

export const settingGroups = {
  sla: [
    { key: 'depositWindowMinutes', min: 5, max: 1440, unit: 'minutes' },
    { key: 'merchantCollectSlaHours', min: 1, max: 168, unit: 'hours' },
    { key: 'merchantReturnSlaHours', min: 1, max: 720, unit: 'hours' },
    { key: 'freePickupHours', min: 1, max: 720, unit: 'hours' }
  ],
  commission: [{ key: 'defaultCommissionRate', min: 0, max: 100, unit: 'percent', decimal: true }],
  penalty: [
    ...['overdueFeeDay1', 'overdueFeeDay2', 'overdueFeeDay3', 'storageFeePerDay'].map(key => ({ key, min: 0, max: 10000000, unit: 'vnd', section: 'fees' })),
    ...['cancelLatePendingPercent', 'cancelDepositedPercent', 'cancelCollectedPercent'].map(key => ({ key, min: 0, max: 100, unit: 'percent', section: 'cancellation' })),
    ...['compensationLightPercent', 'compensationMediumPercent', 'compensationSeverePercent', 'compensationLostPercent'].map(key => ({ key, min: 0, max: 500, unit: 'percent', section: 'compensation' }))
  ]
}
export const settingFields = Object.values(settingGroups).flat()
const number = field => yup.number().transform((value, original) => original === '' || original == null ? NaN : value).typeError('admin.settings.invalidNumber').required('admin.settings.invalidNumber').min(field.min, 'admin.settings.outOfRange').max(field.max, 'admin.settings.outOfRange').test('precision', field.decimal ? 'admin.settings.precision' : 'admin.settings.integer', value => field.decimal ? Math.abs(value * 100 - Math.round(value * 100)) < 1e-7 : Number.isInteger(value))
export const settingsSchema = group => yup.object(Object.fromEntries(settingGroups[group].map(field => [field.key, number(field)]))).test('ordered', 'admin.settings.compensationOrder', function (value) {
  if (group !== 'penalty') {
    return true
  }
  const keys = settingGroups.penalty.filter(field => field.section === 'compensation').map(field => field.key)
  const wrong = keys.findIndex((key, index) => index > 0 && value[key] < value[keys[index - 1]])
  return wrong < 0 || this.createError({ path: keys[wrong], message: 'admin.settings.compensationOrder' })
})
export const settingPayload = (group, values) => Object.fromEntries(settingGroups[group].map(({ key }) => [key, Number(values[key])]))
export const settingSnapshot = value => JSON.stringify([...settingFields.map(field => field.key), 'storageTransferAfterHours', 'updatedAt'].map(key => value[key] ?? null))
export const settingChanges = (group, original, values) => settingGroups[group].filter(({ key }) => original[key] !== Number(values[key]))
export const validSettings = value => Boolean(value && settingFields.every(field => typeof value[field.key] === 'number') && Object.keys(settingGroups).every(group => settingsSchema(group).isValidSync(value)) && Number.isInteger(value.storageTransferAfterHours) && value.storageTransferAfterHours > 0 && (value.updatedAt == null || typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))))
export { unknownWrite } from '~/pages/admin/Services/serviceModel'
