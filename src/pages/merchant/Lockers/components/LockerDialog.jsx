import ResourceGallery from '~/components/ResourceThumbnail/ResourceGallery'
import { Tabs } from '@base-ui/react/tabs'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, MapPin, Hash, History, DoorOpen, Package, Clock, Wrench, Info, ExternalLink, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantLockerApi } from '~/apis/merchant/merchantLockerApi'
import { formatLockerAddress, getLockerMapLink, hasCoordinates } from '~/utils/formats'
import { lockerStateClass, boxStateClass } from '../lockerModel'
import LockerUsage from './LockerUsage'

export default function LockerDialog({ id, initialTab = 'details', onClose }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState(initialTab)
  const load = useCallback((signal) => merchantLockerApi.detail(id, signal), [id])
  const resource = useCatalogResource(load)
  const locker = resource.data
  const [boxFilter, setBoxFilter] = useState(0)
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
        className="max-w-4xl border-primary/15"
        closeLabel="common.close"
      >
        <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <PanelsTopLeft size={23} />
          </span>
          {t('merchant.lockers.details')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-base text-muted-foreground">
          {t('merchant.lockers.detailsHint')}
        </DialogDescription>
        {!locker ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <div className="mt-5 grid gap-5">
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-4 sm:p-5">
              <ResourceGallery
                urls={locker.imageUrls}
                imageLabel="merchant.lockers.image"
                compact
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <Hash size={15} />
                    {locker.code}
                  </p>
                  <h2 className="break-words text-2xl font-bold">
                    {locker.name}
                  </h2>
                  <p className="mt-2 flex items-start gap-2 text-base text-muted-foreground">
                    <MapPin
                      size={18}
                      className="mt-1 shrink-0 text-primary"
                    />
                    <span>
                      {formatLockerAddress(locker)}
                    </span>
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${lockerStateClass(locker.status)}`}>
                  {t(`merchant.lockers.statuses.${locker.status}`, { defaultValue: '—' })}
                </span>
              </div>
            </div>
            <Tabs.Root
              value={tab}
              onValueChange={setTab}
              className="grid gap-5"
            >
              <Tabs.List
                activateOnFocus
                className="grid grid-cols-2 gap-3 border-b border-border"
                aria-label={t('merchant.lockers.views')}
              >
                {[['details', PanelsTopLeft], ['history', History]].map(([key, Icon]) => (
                  <Tabs.Tab
                    key={key}
                    value={key}
                    className="-mb-px flex cursor-pointer items-center justify-center gap-2 border-b-2 border-transparent px-2 py-4 text-base font-medium text-muted-foreground outline-none transition-colors hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary data-active:border-primary data-active:font-semibold data-active:text-primary"
                  >
                    <Icon
                      size={18}
                      className="shrink-0"
                    />
                    {t(`merchant.lockers.${key}`)}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <Tabs.Panel
                value="history"
                className="outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LockerUsage
                  key={id}
                  locker={locker}
                />
              </Tabs.Panel>
              <Tabs.Panel
                value="details"
                className="grid gap-5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[[1, DoorOpen], [2, Package], [3, Clock], [4, Wrench]].map(([status, Icon]) => (
                    <div
                      key={status}
                      className={`rounded-xl border p-4 ${boxStateClass(status)}`}
                    >
                      <Icon size={21} />
                      <p className="mt-2 text-2xl font-bold">
                        <AnimatedNumber value={locker.boxes.filter((box) => box.status === status).length} />
                      </p>
                      <p className="mt-1 text-sm">
                        {t(`merchant.lockers.boxStates.${status}`)}
                      </p>
                    </div>
                  ))}
                </div>
                <dl className="grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2">
                  {[['type', t(`merchant.lockers.types.${locker.lockerType}`, { defaultValue: '—' })], ['area', locker.serviceAreaName || '—']].map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`merchant.lockers.${key}`)}
                      </dt>
                      <dd className="mt-1 text-base font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {locker.description && (
                  <p className="flex items-start gap-3 rounded-xl bg-muted/40 p-4 text-base leading-relaxed">
                    <Info
                      size={19}
                      className="mt-1 shrink-0 text-primary"
                    />
                    <span className="whitespace-pre-wrap break-words">
                      {locker.description}
                    </span>
                  </p>
                )}
                <section className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                      <PanelsTopLeft
                        size={20}
                        className="text-primary"
                      />
                      {t('merchant.lockers.boxes', { count: locker.boxes.length })}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4].map((status) => (
                        <Button
                          key={status}
                          variant={boxFilter === status ? 'default' : 'secondary'}
                          aria-pressed={boxFilter === status}
                          onClick={() => setBoxFilter(status)}
                          className="h-11 px-4 text-base font-semibold"
                        >
                          {status ? t(`merchant.lockers.boxStates.${status}`) : t('common.all')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {locker.boxes.filter((box) => !boxFilter || box.status === boxFilter).map((box) => (
                      <div
                        key={box.id}
                        className={`grid min-w-0 gap-1 rounded-xl border p-3 ${boxStateClass(box.status)}`}
                      >
                        <span className="flex items-center gap-1 font-bold">
                          <DoorOpen size={16} />
                          {t('customer.order.boxShort', { number: box.boxNumber })}
                        </span>
                        <span className="text-xs">
                          {t(`merchant.lockers.sizes.${box.size}`, { defaultValue: '—' })}
                        </span>
                        <span className="text-xs font-medium">
                          {t(`merchant.lockers.boxStates.${box.status}`, { defaultValue: '—' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  {!locker.boxes.some((box) => !boxFilter || box.status === boxFilter) && (
                    <p className="py-5 text-center text-muted-foreground">
                      {t('merchant.lockers.noBoxes')}
                    </p>
                  )}
                </section>
              </Tabs.Panel>
            </Tabs.Root>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={resource.retry}
                disabled={resource.loading}
                className="h-11 px-4 text-base"
              >
                <RefreshCw size={17} />
                {t('customer.orders.refresh')}
              </Button>
              <div className="flex flex-wrap gap-3">
                {hasCoordinates(locker) && (
                  <Button
                    render={(
                      <a
                        href={getLockerMapLink(locker)}
                        target="_blank"
                        rel="noreferrer"
                      />
                    )}
                    nativeButton={false}
                    role="link"
                    className="h-11 px-4 text-base"
                  >
                    <MapPin size={17} />
                    {t('merchant.lockers.openMap')}
                    <ExternalLink size={15} />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="h-11 px-5 text-base"
                >
                  {t('common.close')}
                </Button>
              </div>
            </footer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
