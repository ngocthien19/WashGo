import { IMAGE_UPLOAD } from '../config/constants'

export const getUniqueImageUrls = urls => Array.isArray(urls)
  ? [...new Set(urls.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim()))]
  : []

export const validateImageFile = (file) => {
  if (!IMAGE_UPLOAD.MIME_TYPES.includes(file.type)) {
    return 'customer.profile.imageTypeError'
  }
  if (!file.size || file.size > IMAGE_UPLOAD.MAX_BYTES) {
    return 'customer.profile.imageSizeError'
  }
  return ''
}
