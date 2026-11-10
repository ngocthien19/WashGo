import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Eye } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import FormError from '~/components/ui/FormError'
import { privateDocumentApi, DOCUMENT_TYPES } from '~/apis/privateDocumentApi'
import { getApiError } from '~/utils/apiError'

export default function PrivateDocumentCard({ document, label }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
  }, [preview])
  const open = async (view) => {
    if (request.current) {
      return
    }
    const controller = new AbortController(); request.current = controller
    setPending(true); setError('')
    try {
      const blob = await privateDocumentApi.content(document, controller.signal)
      if (controller.signal.aborted) {
        return
      }
      const url = URL.createObjectURL(blob)
      if (view) {
        setPreview(url)
      } else {
        const anchor = window.document.createElement('a')
        anchor.href = url; anchor.download = document.originalFileName
        window.document.body.append(anchor); anchor.click(); anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(getApiError(failure))
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) {
        setPending(false)
      }
    }
  }
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-1 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words font-semibold">
            {document.originalFileName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(document.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })}
            {' '}
            KB
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {document.contentType === DOCUMENT_TYPES.pdf && (
          <Button
            type="button"
            variant="outline-primary"
            className="h-10 px-4 text-base"
            disabled={pending}
            onClick={() => open(true)}
          >
            <Eye size={17} />
            {t('merchant.backendSync.preview')}
          </Button>
        )}
        <Button
          type="button"
          variant="outline-violet"
          className="h-10 px-4 text-base"
          disabled={pending}
          onClick={() => open(false)}
        >
          <Download size={17} />
          {t('merchant.backendSync.download')}
        </Button>
      </div>
      <FormError>
        {error}
      </FormError>
      {preview && (
        <Dialog
          open
          onOpenChange={(value) => {
            if (!value) {
              setPreview(null)
            }
          }}
        >
          <DialogContent
            className="max-w-4xl"
            closeLabel="common.close"
          >
            <DialogHeader>
              <DialogTitle className="pr-8 text-xl font-bold">
                {label}
              </DialogTitle>
              <DialogDescription className="mt-2 break-words text-sm text-muted-foreground">
                {document.originalFileName}
              </DialogDescription>
            </DialogHeader>
            <iframe
              title={document.originalFileName}
              src={preview}
              className="my-5 h-[55dvh] w-full rounded-lg border border-border"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="h-11 px-5 text-base"
                onClick={() => setPreview(null)}
              >
                {t('common.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
