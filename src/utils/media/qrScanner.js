import { BarcodeDetector, setZXingModuleOverrides } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { QR_SCAN } from '../config/constants'

// Keep decoding local, including the WASM runtime; uploaded images never leave this browser.
setZXingModuleOverrides({ locateFile: () => wasmUrl })

export const decodeQrImage = async (file) => {
  if (!QR_SCAN.MIME_TYPES.includes(file.type) || !file.size || file.size > QR_SCAN.MAX_BYTES) {
    throw new Error('customer.orders.scan.invalidImage')
  }
  let image
  try {
    image = await createImageBitmap(file)
    if (image.width * image.height > QR_SCAN.MAX_PIXELS) {
      throw new Error('customer.orders.scan.invalidImage')
    }
    const codes = await new BarcodeDetector({ formats: ['qr_code'] }).detect(image)
    if (codes.length !== 1 || !codes[0].rawValue) {
      throw new Error('customer.orders.scan.noCode')
    }
    return codes[0].rawValue
  } finally {
    image?.close()
  }
}

export const isOrderQr = (value, orderCode, deposit) => {
  const prefix = `WASHGO:${deposit ? 'DEPOSIT' : 'PICKUP'}:${orderCode}:`
  return typeof value === 'string' && value.startsWith(prefix) && /^[0-9]{6}$/.test(value.slice(prefix.length))
}
