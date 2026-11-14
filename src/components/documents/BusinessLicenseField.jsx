import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { privateDocumentApi, DOCUMENT_TYPES } from '~/apis/files/privateDocumentApi'
import { getApiError } from '~/utils/http/apiError'
import PrivateDocumentCard from './PrivateDocumentCard'

export default function BusinessLicenseField({ current, value, removed, onChange, onBusy, disabled, kind = 1, label, admin = false, merchantId }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const request = useRef(null)
  const [error, setError] = useState('')
  useEffect(() => () => request.current?.abort(), [])
  const document = removed ? null : value || current
  const upload = async (file) => {
    if (!file || request.current) {
      return
    }
    const controller = new AbortController(); request.current = controller
    onBusy(true); setError('')
    try {
      const uploaded = await (admin ? privateDocumentApi.upload(file, kind, controller.signal, merchantId) : privateDocumentApi.uploadLicense(file, controller.signal))
      if (!controller.signal.aborted) {
        onChange(uploaded, false)
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(getApiError(failure))
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) {
        onBusy(false)
      }
    }
  }
  return (
    <div className="space-y-3 sm:col-span-2">
      <h3 className="font-semibold">
        {label || t('merchant.shop.businessLicense')}
      </h3>
      {document ? (
        <PrivateDocumentCard
          document={document}
          label={label || t('merchant.shop.businessLicense')}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(removed ? admin ? 'admin.sync.documentRemoval' : 'merchant.backendSync.removalProposed' : 'merchant.backendSync.noDocument')}
        </p>
      )}
      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label={admin ? t('admin.sync.uploadDocument') : t('merchant.backendSync.uploadLicense')}
        accept={Object.values(DOCUMENT_TYPES).join(',')}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = ''; upload(file)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline-primary"
          className="h-11 px-4 text-base"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} />
          {admin ? t('admin.sync.uploadDocument') : t('merchant.backendSync.uploadLicense')}
        </Button>
        {document && (
          <Button
            type="button"
            variant="destructive"
            className="h-11 px-4 text-base"
            disabled={disabled}
            onClick={() => onChange(null, true)}
          >
            <Trash2 size={17} />
            {t(admin ? 'admin.sync.removeDocument' : 'merchant.backendSync.removeDocument')}
          </Button>
        )}
        {(value || removed) && (
          <Button
            type="button"
            variant="secondary"
            className="h-11 px-4 text-base"
            disabled={disabled}
            onClick={() => onChange(null, false)}
          >
            <RotateCcw size={17} />
            {t('merchant.backendSync.keepDocument')}
          </Button>
        )}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {t('merchant.backendSync.documentRules')}
      </p>
      {!admin && (
        <p className="text-sm leading-6 text-muted-foreground">
          {t('merchant.backendSync.approvalDocuments')}
        </p>
      )}
      <FormError>
        {error}
      </FormError>
    </div>
  )
}
