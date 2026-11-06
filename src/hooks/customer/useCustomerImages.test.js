import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { customerImageApi } from '~/apis/customer/customerImageApi'
import useCustomerImages from './useCustomerImages'

vi.mock('~/apis/customer/customerImageApi', () => ({ customerImageApi: { upload: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`)
  URL.revokeObjectURL = vi.fn()
})
const image = (name) => new File(['image'], name, { type: 'image/png' })

it('rejects invalid images and counts, and releases previews on removal and unmount', () => {
  const { result, unmount } = renderHook(() => useCustomerImages(5))
  act(() => result.current.addFiles([new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' })]))
  expect(result.current.error).toBeTruthy()
  expect(result.current.images).toHaveLength(0)
  act(() => result.current.addFiles([image('a.png'), image('b.png')]))
  act(() => result.current.addFiles(Array.from({ length: 4 }, (_, index) => image(`${index}.png`))))
  expect(result.current.images).toHaveLength(2)
  act(() => result.current.removeImage(result.current.images[0]))
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a.png')
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:b.png')
})

it('reuses successful upload URLs when a later upload fails and the user retries', async () => {
  const { result } = renderHook(() => useCustomerImages(5))
  const first = image('a.png')
  const second = image('b.png')
  act(() => result.current.addFiles([first, second]))
  customerImageApi.upload.mockResolvedValueOnce({ url: '/uploads/a.png' }).mockRejectedValueOnce(new Error('network'))
  await expect(result.current.upload()).rejects.toThrow('network')
  customerImageApi.upload.mockResolvedValueOnce({ url: '/uploads/b.png' })
  expect(await result.current.upload()).toEqual(['/uploads/a.png', '/uploads/b.png'])
  expect(customerImageApi.upload.mock.calls.map(([file]) => file)).toEqual([first, second, second])
})
