import authorizedAxios from '~/utils/authorizedAxios'

export const merchantProfileApi = {
  requestUpdate: async ({ businessName, address, city, latitude, longitude, phone, openingHours, imageUrls }) => {
    const { data } = await authorizedAxios.post('/merchant-profile/update-requests', { businessName, address, city, latitude, longitude, phone, openingHours, imageUrls })
    if (data?.succeeded !== true || !data.data?.id || data.data.status !== 1) {
      const error = new Error('merchant.shop.uncertain')
      error.uncertain = true
      throw error
    }
    return data.data
  }
}
