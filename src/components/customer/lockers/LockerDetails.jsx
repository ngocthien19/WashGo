import { useCallback } from 'react'
import { ArrowUpRight, Check, DoorOpen, Hash, Info, MapPin, PanelsTopLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import { formatLockerAddress, getLockerMapLink } from '~/utils/formats'
import { LOCKER_SLOT_SIZES } from '~/utils/constants'

export default function LockerDetails({ id, onClose }) {
  const load = useCallback((signal) => customerCatalogApi.getLocker(id, signal), [id])
  const { data: locker, loading, error, retry } = useCatalogResource(load)
  const mapLink = locker && getLockerMapLink(locker)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="Đóng chi tiết locker"
        className="flex max-w-2xl flex-col overflow-hidden rounded-3xl p-0 sm:p-0"
      >
        <div className="flex shrink-0 items-center gap-4 border-b border-primary/15 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-6 pr-14 sm:px-7">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
            <PanelsTopLeft
              size={25}
              strokeWidth={1.7}
            />
          </span>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Chi tiết locker
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Vị trí và các ô trống hiện tại
            </DialogDescription>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-6 sm:p-7">
          {loading || error || !locker ? (
            <CatalogFeedback
              loading={loading}
              loadingText="Đang tải locker..."
              error={error}
              retry={retry}
              empty="Không tìm thấy locker khả dụng."
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="mb-3 inline-flex max-w-full items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Hash className="mt-0.5 size-3.5 shrink-0" />
                    <span className="break-all">
                      {locker.code}
                    </span>
                  </p>
                  <h3 className="break-words text-2xl font-bold leading-snug tracking-tight">
                    {locker.name}
                  </h3>
                  <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                    <MapPin className="mt-1 size-4 shrink-0 text-primary" />
                    <span className="break-words">
                      {formatLockerAddress(locker)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 sm:min-w-28 sm:flex-col sm:justify-center sm:gap-1 sm:text-center">
                  <DoorOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
                  <strong className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                    {locker.availableSlotCount}
                  </strong>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    ô đang trống
                  </span>
                </div>
              </div>
              {locker.description && (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/25 p-4">
                  <Info className="mt-1 size-4 shrink-0 text-primary" />
                  <p className="whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
                    {locker.description}
                  </p>
                </div>
              )}
              <section>
                <h4 className="flex items-center gap-2 font-semibold">
                  <PanelsTopLeft
                    size={18}
                    className="text-primary"
                  />
                  {`Ô trống (${locker.availableSlotCount})`}
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {locker.availableSlots?.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-card p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <DoorOpen
                          className="size-6 text-emerald-600 dark:text-emerald-400"
                          strokeWidth={1.5}
                        />
                        <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          <Check size={12} />
                        </span>
                      </div>
                      <p className="text-base font-bold">
                        {`Ô ${slot.slotNumber}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {LOCKER_SLOT_SIZES[slot.size] || 'Chưa rõ kích thước'}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  Số ô trống được cập nhật khi mở chi tiết và có thể thay đổi.
                </p>
              </section>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          {mapLink && (
            <Button
              render={(
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              )}
              nativeButton={false}
              className="h-10 rounded-xl px-4"
            >
              <MapPin size={16} />
              Mở Google Maps
              <ArrowUpRight size={16} />
            </Button>
          )}
          <Button
            variant="secondary"
            className="h-10 rounded-xl px-5"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
