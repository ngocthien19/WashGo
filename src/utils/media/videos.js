export const VIDEO_UPLOAD = { ENDPOINT: '/files/videos', MAX_BYTES: 50 * 1024 * 1024, MAX_FILES: 2, ACCEPT: '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime' }
export const validateVideoFile = (file) => {
  if (!/\.(mp4|webm|mov)$/i.test(file.name) || file.type && !['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
    return 'customer.sync.videoType'
  }
  return !file.size || file.size > VIDEO_UPLOAD.MAX_BYTES ? 'customer.sync.videoSize' : ''
}
