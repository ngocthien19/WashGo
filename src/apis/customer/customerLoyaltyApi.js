import authorizedAxios from '~/utils/http/authorizedAxios'

const integer = value => Number.isSafeInteger(value) && value >= 0
const money = value => Number.isFinite(value) && value >= 0
const invalid = () => new Error('loyalty.invalidResponse')
const unwrap = (response, valid) => {
  const value = response.data?.data
  if (response.data?.succeeded !== true || !valid(value)) {
    throw invalid()
  }
  return value
}
const kinds = ['Opening', 'Hold', 'Release', 'Redeem', 'Earn', 'RefundPoints', 'ReverseReward']
const entry = row => row?.id && kinds.includes(row.kind) && ['pointsDelta', 'heldDelta', 'netPointsAfter'].every(key => Number.isSafeInteger(row[key])) && integer(row.heldPointsAfter) && Number.isFinite(Date.parse(row.createdAt))

export const customerLoyaltyApi = {
  balance: signal => authorizedAxios.get('/customer/loyalty/balance', { signal }).then(response => unwrap(response, value => value && ['totalPoints', 'heldPoints', 'availablePoints', 'debtPoints'].every(key => integer(value[key])) && value.vndPerPoint === 1 && money(value.earnPercent) && value.earnPercent <= 100 && money(value.maxUsePercent) && value.maxUsePercent <= 99 && value.availablePoints <= value.totalPoints && (!value.debtPoints || value.availablePoints === 0))),
  history: async (page = 1, signal) => {
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
      throw invalid()
    }
    const { data } = await authorizedAxios.get('/customer/loyalty/history', { params: { page, take: 20 }, signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(entry) || !integer(data.total) || data.currentPage !== page) {
      throw invalid()
    }
    return { ...data, totalPages: Math.ceil(data.total / 20) }
  },
  quote: (orderId, pointsToRedeem = 0, signal) => {
    if (!orderId || !integer(pointsToRedeem)) {
      throw invalid()
    }
    return authorizedAxios.get(`/customer/loyalty/quote/${encodeURIComponent(orderId)}`, { params: { pointsToRedeem }, signal }).then(response => unwrap(response, value => value?.orderId === orderId && value.isEstimate === true && ['availablePoints', 'maximumPoints', 'pointsToRedeem', 'expectedEarnedPoints'].every(key => integer(value[key])) && value.pointsToRedeem === pointsToRedeem && value.pointsToRedeem <= value.maximumPoints && value.maximumPoints <= value.availablePoints && money(value.laundryAmount) && money(value.cashAmount) && value.cashAmount > 0 && Math.abs(value.laundryAmount - value.cashAmount - value.pointsToRedeem) < .001))
  }
}
