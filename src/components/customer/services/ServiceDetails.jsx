import ResourceGallery from '~/components/ResourceThumbnail/ResourceGallery'
import { catalogImages } from '~/apis/customer/customerCatalogApi'
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { AlignLeft, ClipboardList, Clock3, Hash } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { formatCurrency } from '~/utils/format/formats'
import { SERVICE_TYPES } from '~/utils/config/constants'
import useCatalogResource from '~/hooks/useCatalogResource'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ServiceIcon from './ServiceIcon'

export default function ServiceDetails({ id, onClose }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => customerCatalogApi.getService(id, signal), [id])
  const { data: service, loading, error, retry } = useCatalogResource(load)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="flex max-w-2xl flex-col overflow-hidden rounded-3xl p-0 sm:p-0">
        <div className="flex shrink-0 items-center gap-4 border-b border-primary/15 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-6 pr-14 sm:px-7">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
            <ClipboardList
              size={25}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {t('customer.viewDetails')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('customer.laundryServiceInformation')}
            </DialogDescription>
          </div>
        </div>
        {loading || error || !service ? (
          <div className="min-h-0 overflow-y-auto p-6">
            <CatalogFeedback
              loading={loading}
              error={error}
              retry={retry}
              empty={t('customer.serviceNotFound')}
            />
          </div>
        ) : (
          <div className="min-h-0 space-y-6 overflow-y-auto p-6 sm:p-7">
            <ResourceGallery
              urls={catalogImages(service)}
              imageLabel="catalogUi.photo"
              thumbnails
            />
            <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
                  <ServiceIcon
                    type={service.serviceType}
                    className="size-4"
                  />
                  {t(SERVICE_TYPES.find((type) => type.value === String(service.serviceType))?.label || 'customer.laundryService')}
                </span>
                <h3 className="mt-3 break-words text-2xl font-bold leading-snug tracking-tight">
                  {service.name}
                </h3>
              </div>
              <div className="min-w-0 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 to-card p-4 sm:max-w-60">
                <p className="break-words text-2xl font-bold tracking-tight text-primary">
                  {formatCurrency(service.unitPrice)}
                </p>
                {service.unit && (
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    /
                    {' '}
                    {service.unit}
                  </p>
                )}
              </div>
            </div>
            <section className="rounded-2xl border border-border bg-muted/25 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <AlignLeft
                  size={16}
                  className="text-primary"
                  aria-hidden="true"
                />
                {t('customer.aboutThisService')}
              </h4>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
                {service.description || t('customer.theDescriptionIsBeingUpdated')}
              </p>
            </section>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-border bg-muted/35 p-4">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash
                    size={15}
                    aria-hidden="true"
                  />
                  {t('customer.serviceCode')}
                </dt>
                <dd className="mt-2 break-all font-semibold">
                  {service.code || t('customer.notProvided')}
                </dd>
              </div>
              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3
                    size={15}
                    aria-hidden="true"
                  />
                  {t('customer.estimatedDuration')}
                </dt>
                <dd className="mt-2 font-semibold">
                  {service.estimatedDurationHours > 0 ? t('customer.hours', { estimatedDurationHours: service.estimatedDurationHours }) : t('customer.notUpdatedYet')}
                </dd>
              </div>
            </dl>
          </div>
        )}
        <div className="flex shrink-0 justify-end border-t border-border bg-muted/20 px-6 py-4">
          <Button
            variant="secondary"
            className="h-12 rounded-xl px-6 text-base"
            onClick={onClose}
          >
            {t('customer.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
