import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { videoApi } from '~/apis/videoApi'
import useVideos from './useVideos'
import { validateVideoFile, VIDEO_UPLOAD } from '~/utils/videos'
vi.mock('~/apis/videoApi', () => ({ videoApi: { upload: vi.fn() } }))
it('rejects non-video, zero-byte and oversized files', () => {
  expect(validateVideoFile(new File(['bad'], 'bad.png', { type: 'image/png' }))).toBeTruthy()
  expect(validateVideoFile(new File([], 'empty.mp4', { type: 'video/mp4' }))).toBeTruthy()
  expect(validateVideoFile({ name: 'large.mov', type: 'video/quicktime', size: VIDEO_UPLOAD.MAX_BYTES + 1 })).toBeTruthy()
})
it('retains remote evidence and caches successful uploads when saving is retried', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:video'); URL.revokeObjectURL = vi.fn()
  const { result, unmount } = renderHook(() => useVideos(['/uploads/old.mp4']))
  const file = new File(['video'], 'new.mp4', { type: 'video/mp4' })
  act(() => result.current.addFiles([file]))
  videoApi.upload.mockResolvedValue({ url: '/uploads/new.mp4' })
  expect(await result.current.upload()).toEqual(['/uploads/old.mp4', '/uploads/new.mp4'])
  await result.current.upload()
  expect(videoApi.upload).toHaveBeenCalledTimes(1)
  act(() => result.current.addFiles([file]))
  expect(result.current.videos).toHaveLength(2)
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video')
})
