export const getApiError = (error) => {
  if (error.response?.status === 429) {
    return 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.'
  }
  if (error.response?.status === 401) {
    return 'Email hoặc mật khẩu không đúng, hoặc phiên đăng nhập đã hết hạn.'
  }
  if (error.code === 'ECONNABORTED') {
    return 'Kết nối quá thời gian chờ. Vui lòng thử lại.'
  }
  if (error.isAxiosError && !error.response) {
    return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.'
  }
  return error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.'
}
