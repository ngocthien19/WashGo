import { Blob as BinaryBlob } from 'node:buffer'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { privateDocumentApi, validateDocumentFile, DOCUMENT_LIMIT } from './privateDocumentApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const id = '11111111-1111-4111-8111-111111111111'
const document = { fileId: id, kind: 1, originalFileName: 'license.pdf', contentType: 'application/pdf', size: 12 }
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())
it('accepts only nonempty PDF DOC DOCX files within the limit and safe file names', () => {
  expect(validateDocumentFile({ name: 'license.pdf', type: 'application/pdf', size: DOCUMENT_LIMIT })).toBe(true)
  for (const file of [{ name: 'license.svg', size: 10 }, { name: 'license.pdf', size: 0 }, { name: 'license.docx', size: DOCUMENT_LIMIT + 1 }, { name: '../license.pdf', size: 10 }, { name: 'license.pdf', type: 'text/html', size: 10 }]) {
    expect(validateDocumentFile(file)).toBe(false)
  }
})
it('uploads a Merchant license with the exact form contract and no claimed Merchant identity', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: document } })
  const file = new File(['%PDF-1.4'], 'license.pdf', { type: 'application/pdf' })
  expect(await privateDocumentApi.uploadLicense(file)).toEqual(document)
  const [path, body] = authorizedAxios.post.mock.calls[0]
  expect(path).toBe('/files/documents')
  expect([...body.keys()]).toEqual(['file', 'kind'])
  expect(body.get('kind')).toBe('BusinessLicense')
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...document, kind: 3 } } })
  await expect(privateDocumentApi.uploadLicense(file)).rejects.toThrow('merchant.backendSync.invalidDocument')
})
it('downloads through the authenticated API by ID and rejects error blobs disguised as PDFs', async () => {
  vi.stubGlobal('Blob', BinaryBlob)
  const blob = new BinaryBlob(['%PDF-1.4 test'], { type: 'application/pdf' })
  authorizedAxios.get.mockResolvedValue({ data: blob })
  expect(await privateDocumentApi.content({ ...document, downloadUrl: 'https://untrusted.test/file' })).toBe(blob)
  expect(authorizedAxios.get).toHaveBeenCalledWith(`/files/documents/${id}/download`, { responseType: 'blob', signal: undefined })
  authorizedAxios.get.mockResolvedValue({ data: new BinaryBlob(['{"message":"denied"}'], { type: 'application/pdf' }) })
  await expect(privateDocumentApi.content(document)).rejects.toThrow('merchant.backendSync.invalidDocument')
})
