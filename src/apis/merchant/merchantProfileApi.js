import authorizedAxios from '~/utils/http/authorizedAxios'

export const merchantProfileApi = {
  requestUpdate: async (values) => {
    if (typeof values.expectedMerchantVersion !== 'string' || !values.expectedMerchantVersion.trim()) {
      throw new Error('merchant.backendSync.profileChanged')
    }
    const payload = Object.fromEntries(['businessName', 'address', 'city', 'latitude', 'longitude', 'phone', 'openingHours', 'imageUrls', 'taxCode', 'businessLicenseDocumentId', 'removeBusinessLicenseDocument', 'operationId', 'expectedMerchantVersion'].filter((key) => values[key] !== undefined).map((key) => [key, values[key]]))
    const { data } = await authorizedAxios.post('/merchant-profile/update-requests', payload)
    if (data?.succeeded !== true || !data.data?.id || data.data.status !== 1) {
      const error = new Error('merchant.shop.uncertain')
      error.uncertain = true
      throw error
    }
    return data.data
  }
}
