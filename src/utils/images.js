import { IMAGE_UPLOAD } from './constants'

export const validateImageFile = (file) => {
  if (!IMAGE_UPLOAD.MIME_TYPES.includes(file.type)) {
    return 'customer.profile.imageTypeError'
  }
  if (!file.size || file.size > IMAGE_UPLOAD.MAX_BYTES) {
    return 'customer.profile.imageSizeError'
  }
  return ''
}
