import { describe, expect, it, vi } from 'vitest'
import { decodeQrImage, isOrderQr } from './qrScanner'
import { QR_SCAN } from '../config/constants'

const detect = vi.hoisted(() => vi.fn())
vi.mock('barcode-detector/ponyfill', () => ({
  BarcodeDetector: class {
    detect = detect
  }, setZXingModuleOverrides: vi.fn()
}))

describe('QR image decoding', () => {
  it('rejects unsupported or oversized files before image decoding', async () => {
    await expect(decodeQrImage({ type: 'image/svg+xml', size: 5 })).rejects.toThrow('customer.orders.scan.invalidImage')
    await expect(decodeQrImage({ type: 'image/png', size: QR_SCAN.MAX_BYTES + 1 })).rejects.toThrow('customer.orders.scan.invalidImage')
    expect(detect).not.toHaveBeenCalled()
  })
  it('decodes one QR locally and closes the image even when no QR is found', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 100, close }))
    try {
      detect.mockResolvedValueOnce([{ rawValue: 'WASHGO:DEPOSIT:WG123:123456' }]).mockResolvedValueOnce([])
      await expect(decodeQrImage({ type: 'image/png', size: 100 })).resolves.toBe('WASHGO:DEPOSIT:WG123:123456')
      await expect(decodeQrImage({ type: 'image/png', size: 100 })).rejects.toThrow('customer.orders.scan.noCode')
      expect(close).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('checks order and purpose without treating local checks as PIN verification', () => {
    expect(isOrderQr('WASHGO:DEPOSIT:WG123:000000', 'WG123', true)).toBe(true)
    for (const value of ['https://malicious.test', 'WASHGO:ORDER:WG123', 'WASHGO:PICKUP:WG123:123456', 'WASHGO:DEPOSIT:WG999:123456', 'WASHGO:DEPOSIT:WG123:abc123']) {
      expect(isOrderQr(value, 'WG123', true)).toBe(false)
    }
  })
})
