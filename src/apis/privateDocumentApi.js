import { hasControlCharacters } from '~/utils/formats'
import authorizedAxios from '~/utils/authorizedAxios'

export const DOCUMENT_LIMIT = 10 * 1024 * 1024
export const DOCUMENT_TYPES = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
const invalid = () => new Error('merchant.backendSync.invalidDocument')
export const validateDocumentFile = (file) => {
  const extension = file?.name?.split('.').pop()?.toLowerCase()
  return Boolean(DOCUMENT_TYPES[extension] && file.size > 0 && file.size <= DOCUMENT_LIMIT && file.name.length <= 180 && !hasControlCharacters(file.name) && !/[/\\]/.test(file.name) && (!file.type || file.type === DOCUMENT_TYPES[extension]))
}
const metadata = (value) => {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value?.fileId || '') || ![1, 2, 3].includes(value.kind) || typeof value.originalFileName !== 'string' || !value.originalFileName || (hasControlCharacters(value.originalFileName) || /[/\\]/.test(value.originalFileName)) || !Object.values(DOCUMENT_TYPES).includes(value.contentType) || !Number.isSafeInteger(value.size) || value.size <= 0 || value.size > DOCUMENT_LIMIT) {
    throw invalid()
  }
  return value
}
export const privateDocumentApi = {
  uploadLicense: (file, signal) => privateDocumentApi.upload(file, 1, signal),
  upload: async (file, kind, signal, merchantId) => {
    if (!validateDocumentFile(file)) {
      throw new Error('merchant.backendSync.documentRules')
    }
    const body = new FormData()
    body.append('file', file); body.append('kind', { 1: 'BusinessLicense', 2: 'Contract', 3: 'Sla' }[kind])
    if (merchantId) {
      body.append('merchantId', merchantId)
    }
    const { data } = await authorizedAxios.post('/files/documents', body, { signal })
    if (data?.succeeded !== true) {
      throw invalid()
    }
    const value = metadata(data.data)
    if (value.kind !== kind) {
      throw invalid()
    }
    return value
  },
  read: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/files/documents/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.fileId !== id) {
      throw invalid()
    }
    return metadata(data.data)
  },
  content: async (document, signal) => {
    metadata(document)
    // Always authenticate by ID; never navigate to a DTO URL or expose the access token in a link.
    const { data } = await authorizedAxios.get(`/files/documents/${encodeURIComponent(document.fileId)}/download`, { responseType: 'blob', signal }).catch((failure) => {
      if (failure.response?.status === 403) {
        throw new Error('merchant.backendSync.documentForbidden')
      }
      if (failure.response?.status === 404) {
        throw new Error('merchant.backendSync.documentUnavailable')
      }
      throw failure
    })
    if (!(data instanceof Blob) || !data.size || data.size > DOCUMENT_LIMIT || data.type.split(';')[0].toLowerCase() !== document.contentType) {
      throw invalid()
    }
    if (document.contentType === DOCUMENT_TYPES.pdf && await data.slice(0, 5).text() !== '%PDF-') {
      throw invalid()
    }
    return data
  }
}
