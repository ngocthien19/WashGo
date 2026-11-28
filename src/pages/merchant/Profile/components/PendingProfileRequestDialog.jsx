import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FileClock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ProfileRequestDetails from '~/components/merchant-profile/ProfileRequestDetails'
import ProfileRequestStatus from '~/components/merchant-profile/ProfileRequestStatus'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantProfileApi } from '~/apis/merchant/merchantProfileApi'
import { privateDocumentApi } from '~/apis/files/privateDocumentApi'

export default function PendingProfileRequestDialog({ id, merchantId, onClose }) {
  const { t } = useTranslation()
  const load = useCallback(async signal => {
    const request = await merchantProfileApi.request(id, merchantId, signal)
    const ids = [...new Set([request.current.businessLicenseDocumentId, request.proposed.businessLicenseDocumentId].filter(Boolean))]
    const metadata = await Promise.allSettled(ids.map(fileId => privateDocumentApi.read(fileId, signal)))
    return { ...request, documentMetadata: Object.fromEntries(metadata.flatMap((entry, index) => entry.status === 'fulfilled' ? [[ids[index], entry.value]] : [])) }
  }, [id, merchantId])
  const resource = useCatalogResource(load)
  return (
    <Dialog
      open
      onOpenChange={open => !open && onClose()}
    >
      <DialogContent
        ready={!resource.loading}
        className="max-w-5xl"
        closeLabel="common.close"
        data-dialog-fixed
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-4 text-xl font-bold sm:text-2xl">
            <FileClock />
            {t('merchant.shop.updateDetails')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-7 text-muted-foreground">
            {t('merchant.shop.updateDetailsHint')}
          </DialogDescription>
        </DialogHeader>
        <div
          className="mt-5 space-y-5"
          data-dialog-layout
        >
          <div
            className="space-y-5"
            data-dialog-body
          >
            {resource.error || !resource.data ? <ResourceFeedback {...resource} /> : (
              <>
                <ProfileRequestStatus status={resource.data.status} />
                <ProfileRequestDetails value={resource.data} />
              </>
            )}
          </div>
          <div
            className="flex justify-end"
            data-dialog-footer
          >
            <Button
              variant="secondary"
              className="h-11 px-5 text-base"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
