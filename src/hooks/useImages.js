import useMediaFiles from './useMediaFiles'
import { imageApi } from '~/apis/files/imageApi'
import { validateImageFile } from '~/utils/media/images'
export default function useImages(maxImages, initialUrls = []) {
  const media = useMediaFiles({ limit: maxImages, validate: validateImageFile, uploadFile: imageApi.upload, limitError: maxImages <= 1 ? 'customer.imageUpload.singleLimit' : 'customer.imageUpload.limit', initialUrls: maxImages === 1 ? initialUrls.slice(0, 1) : initialUrls })
  return { ...media, images: media.files, maxImages, removeImage: media.removeFile }
}
