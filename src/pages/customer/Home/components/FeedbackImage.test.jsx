import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FeedbackImage from './FeedbackImage'
import { customerReviewApi } from '~/apis/customer/customerReviewApi'
vi.mock('~/apis/customer/customerReviewApi', () => ({ customerReviewApi: { image: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())
it('revokes the private object URL and aborts its request on unmount', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:private-review')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  customerReviewApi.image.mockResolvedValue(new Blob(['image'], { type: 'image/png' }))
  const view = render(<FeedbackImage
    reviewId="review"
    path="path"
    index={0}
  />)
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:private-review'))
  const signal = customerReviewApi.image.mock.calls.at(-1)[2]
  view.unmount()
  expect(signal.aborted).toBe(true)
  expect(create).toHaveBeenCalledTimes(1)
  expect(revoke).toHaveBeenCalledWith('blob:private-review')
})
