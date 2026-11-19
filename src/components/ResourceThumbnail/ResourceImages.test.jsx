import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import ResourceThumbnail from './ResourceThumbnail'
import ResourceGallery from './ResourceGallery'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import ImagePicker from '~/components/ImagePicker'

it('shows only the first photo with no surplus badge and keeps the thumbnail noninteractive', () => {
  const view = render(<ResourceThumbnail
    urls={[' /one.png ', '/one.png', null, '', '/two.png', '/three.png']}
    name="Service"
  />)
  expect(screen.queryByText('+2')).not.toBeInTheDocument()
  expect(screen.getAllByRole('img')).toHaveLength(1)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  fireEvent.error(screen.getByRole('img'))
  expect(view.container.querySelector('img')).toBeNull()
  expect(screen.queryByText('+2')).not.toBeInTheDocument()
  view.rerender(<ResourceThumbnail
    urls={['/replacement.png']}
    name="Service"
  />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/replacement.png')
  expect(screen.queryByText('+2')).not.toBeInTheDocument()
})

it('shows only the first catalog detail photo without changing its new-tab link', () => {
  render(<ResourceGallery urls={['/first.png', '/second.png']} />)
  expect(screen.getAllByRole('img')).toHaveLength(1)
  expect(screen.getByRole('link')).toHaveAttribute('href', '/first.png')
  expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
})

it('keeps all gallery links opening the original URL in a new tab even when a photo fails', () => {
  const view = render(<CustomerImageGallery urls={['/one.png', '/two.png', '/one.png', null, '']} />)
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(2)
  expect(links[0]).toHaveAttribute('href', '/one.png')
  expect(links[0]).toHaveAttribute('target', '_blank')
  fireEvent.error(links[0].querySelector('img'))
  expect(links[0].querySelector('img')).toBeNull()
  expect(screen.getByTitle('Không tải được ảnh')).toBeInTheDocument()
  expect(links[0]).toHaveAttribute('href', '/one.png')
  expect(links[0]).toHaveAttribute('target', '_blank')
  view.rerender(<CustomerImageGallery urls={['/replacement.png']} />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/replacement.png')
})

it('allows removing an unavailable upload preview without losing the image count', () => {
  const image = { url: '/unavailable.png' }
  const selection = { images: [image], maxImages: 1, removeImage: vi.fn(), addFiles: vi.fn() }
  render(<ImagePicker
    title="Photos"
    selection={selection}
  />)
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByTitle('Không tải được ảnh')).toBeInTheDocument()
  expect(screen.getByText('1 / 1')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh 1', exact: true }))
  expect(selection.removeImage).toHaveBeenCalledWith(image)
})
