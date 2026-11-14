import useMediaFiles from './useMediaFiles'
import { videoApi } from '~/apis/files/videoApi'
import { VIDEO_UPLOAD, validateVideoFile } from '~/utils/media/videos'
export default function useVideos(initialUrls = []) {
  const media = useMediaFiles({ limit: VIDEO_UPLOAD.MAX_FILES, validate: validateVideoFile, uploadFile: videoApi.upload, limitError: 'customer.sync.videoLimit', initialUrls })
  return { ...media, videos: media.files, removeVideo: media.removeFile }
}
