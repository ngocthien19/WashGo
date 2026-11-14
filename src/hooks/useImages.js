import useMediaFiles from './useMediaFiles'
import { imageApi } from '~/apis/files/imageApi'
import { validateImageFile } from '~/utils/media/images'
export default function useImages(maxImages, initialUrls = []) {
  const media = useMediaFiles({ limit: maxImages, validate: validateImageFile, uploadFile: imageApi.upload, limitError: 'customer.imageUpload.limit', initialUrls })
  return { ...media, images: media.files, maxImages, removeImage: media.removeFile }
}
