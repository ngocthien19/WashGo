import authorizedAxios from '~/utils/http/authorizedAxios'

export const merchantProfileApi = {
  request: async (id, merchantId, signal) => {
    const { data } = await authorizedAxios.get(`/merchant-profile-request/${encodeURIComponent(id)}`, { signal })
    const value = data?.data
    if (data?.succeeded !== true || value?.id !== id || value.merchantId !== merchantId || ![1, 2, 3].includes(value.status) || !value.current || !value.proposed || !Array.isArray(value.changedFields) || value.changedFields.some(field => typeof field !== 'string')) {
      throw new Error('merchant.invalidResponse')
    }
    return value
  },
  requestUpdate: async (values) => {
    if (typeof values.expectedMerchantVersion !== 'string' || !values.expectedMerchantVersion.trim()) {
      throw new Error('merchant.backendSync.profileChanged')
    }
    const payload = Object.fromEntries(['businessName', 'address', 'city', 'latitude', 'longitude', 'phone', 'openingHours', 'openingSchedule', 'imageUrls', 'taxCode', 'businessLicenseDocumentId', 'removeBusinessLicenseDocument', 'operationId', 'expectedMerchantVersion'].filter((key) => values[key] !== undefined).map((key) => [key, values[key]]))
    const { data } = await authorizedAxios.post('/merchant-profile/update-requests', payload)
    if (data?.succeeded !== true || !data.data?.id || data.data.status !== 1) {
      const error = new Error('merchant.shop.uncertain')
      error.uncertain = true
      throw error
    }
    return data.data
  }
}
