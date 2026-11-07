import authorizedAxios from '~/utils/authorizedAxios'

export const customerReceiptApi = {
  get: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/wash-order/${encodeURIComponent(id)}/receipt`, { signal })
    const receipt = data?.data
    if (data?.succeeded !== true || receipt?.orderId !== id || !receipt.receiptNumber || !Array.isArray(receipt.lines) || !Array.isArray(receipt.fees) || !Array.isArray(receipt.payments) || !Number.isFinite(receipt.totalPaid)) {
      throw new Error('customer.sync.invalidResponse')
    }
    return receipt
  },
  download: async (id) => {
    const { data } = await authorizedAxios.get(`/wash-order/${encodeURIComponent(id)}/receipt/pdf`, { responseType: 'blob' })
    if (!(data instanceof Blob) || (await data.slice(0, 5).text()) !== '%PDF-') {
      throw new Error('customer.sync.invalidResponse')
    }
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url; link.download = `washgo-receipt-${id}.pdf`
    document.body.append(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
