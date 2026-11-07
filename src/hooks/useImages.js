import useMediaFiles from './useMediaFiles'
import { imageApi } from '~/apis/imageApi'
import { validateImageFile } from '~/utils/images'
export default function useImages(maxImages, initialUrls = []) {
  const media = useMediaFiles({ limit: maxImages, validate: validateImageFile, uploadFile: imageApi.upload, limitError: 'customer.imageUpload.limit', initialUrls })
  return { ...media, images: media.files, maxImages, removeImage: media.removeFile }
}
