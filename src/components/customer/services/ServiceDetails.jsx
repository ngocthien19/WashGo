import { useCallback } from 'react'
import { AlignLeft, ClipboardList, Clock3, Hash } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { formatCurrency } from '~/utils/formats'
import { SERVICE_TYPES } from '~/utils/constants'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import ServiceIcon from './ServiceIcon'

export default function ServiceDetails({ id, onClose }) {
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
      <DialogContent className="flex max-w-xl flex-col overflow-hidden rounded-3xl p-0 sm:p-0">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-5 pr-14">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList
              size={22}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <div>
            <DialogTitle className="text-lg font-bold">
              Xem chi tiết
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-5 text-muted-foreground">
              Thông tin dịch vụ giặt ủi
            </DialogDescription>
          </div>
        </div>
        {loading || error || !service ? (
          <div className="min-h-0 overflow-y-auto p-6">
            <CatalogFeedback
              loading={loading}
              error={error}
              retry={retry}
              empty="Không tìm thấy dịch vụ."
            />
          </div>
        ) : (
          <div className="min-h-0 space-y-6 overflow-y-auto p-6 sm:p-7">
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 to-primary/3 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-card text-primary">
                  <ServiceIcon type={service.serviceType} />
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  {SERVICE_TYPES.find((type) => type.value === String(service.serviceType))?.label || 'Dịch vụ giặt ủi'}
                </p>
              </div>
              <h3 className="mt-4 break-words text-xl font-bold leading-8 sm:text-2xl">
                {service.name}
              </h3>
              <p className="mt-3 text-2xl font-bold text-primary">
                {formatCurrency(service.unitPrice)}
                <span className="text-sm font-normal text-muted-foreground">
                  {service.unit ? ` / ${service.unit}` : ''}
                </span>
              </p>
            </div>
            <section>
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <AlignLeft
                  size={16}
                  className="text-primary"
                  aria-hidden="true"
                />
                Về dịch vụ
              </h4>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
                {service.description || 'Thông tin mô tả đang được cập nhật.'}
              </p>
            </section>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-border bg-muted/35 p-4">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash
                    size={15}
                    aria-hidden="true"
                  />
                  Mã dịch vụ
                </dt>
                <dd className="mt-2 break-all font-semibold">
                  {service.code || 'Chưa có'}
                </dd>
              </div>
              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3
                    size={15}
                    aria-hidden="true"
                  />
                  Thời gian dự kiến
                </dt>
                <dd className="mt-2 font-semibold">
                  {service.estimatedDurationHours > 0 ? `${service.estimatedDurationHours} giờ` : 'Chưa cập nhật'}
                </dd>
              </div>
            </dl>
          </div>
        )}
        <div className="flex shrink-0 justify-end border-t border-border bg-muted/20 px-6 py-4">
          <Button
            variant="secondary"
            className="h-10 rounded-xl px-6"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
