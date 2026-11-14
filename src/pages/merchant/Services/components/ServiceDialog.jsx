import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Shirt, FileText, Pencil, CalendarDays } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantServiceApi } from '~/apis/merchant/merchantServiceApi'
import { formatDateTime } from '~/utils/format/formats'
import { approvalClass, proposalBlockedMessage } from '../serviceModel'
import ServiceInfo from './ServiceInfo'

export default function ServiceDialog({ selected, onClose, onEdit }) {
  const { t } = useTranslation()
  const proposal = selected.kind === 'proposal'
  const load = useCallback((signal) => proposal ? merchantServiceApi.proposal(selected.id, signal) : merchantServiceApi.service(selected.id, signal), [proposal, selected.id])
  const resource = useCatalogResource(load)
  const value = resource.data
  const handingOffToEditor = selected.kind === 'edit' && value?.canProposeUpdate === true && Boolean(value.version)
  useEffect(() => {
    if (selected.kind === 'edit' && value?.canProposeUpdate === true && value.version) {
      onEdit(value)
    }
  }, [selected.kind, value, onEdit])
  const Icon = proposal ? FileText : Shirt
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
        ready={!resource.loading && !handingOffToEditor}
        className={`${proposal ? 'max-w-5xl' : 'max-w-3xl'} border-primary/15`}
        closeLabel="common.close"
      >
        <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon size={23} />
          </span>
          {t(proposal ? 'merchant.services.proposalDetails' : 'merchant.services.details')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-base text-muted-foreground">
          {t(proposal ? 'merchant.services.snapshotHint' : 'merchant.services.sharedHint')}
        </DialogDescription>
        {!value ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <div className="mt-5 grid gap-5">
            {proposal ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${approvalClass(value.status)}`}>
                    {t(`merchant.services.approval.${value.status}`)}
                  </span>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays size={16} />
                    {formatDateTime(value.createdAt)}
                  </p>
                </div>
                <div className={`grid gap-5 ${value.current ? 'lg:grid-cols-2' : ''}`}>
                  {value.current && (
                    <section className="grid content-start gap-4 rounded-2xl border border-border p-5">
                      <h2 className="border-b border-border pb-3 text-base font-bold">
                        {t('merchant.services.before')}
                      </h2>
                      <ServiceInfo value={value.current} />
                    </section>
                  )}
                  <section className="grid content-start gap-4 rounded-2xl border border-primary/20 bg-primary/3 p-5">
                    <h2 className="border-b border-primary/15 pb-3 text-base font-bold text-foreground">
                      {t('merchant.services.proposed')}
                    </h2>
                    <ServiceInfo value={value.proposed} />
                  </section>
                </div>
                {value.reason && (
                  <div className="rounded-xl bg-muted/30 p-4">
                    <p className="mb-2 font-semibold">
                      {t('merchant.services.reason')}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-base">
                      {value.reason}
                    </p>
                  </div>
                )}
                {value.rejectionReason && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-700 dark:text-red-300">
                    <p className="mb-2 font-semibold">
                      {t('merchant.services.rejectionReason')}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-base">
                      {value.rejectionReason}
                    </p>
                  </div>
                )}
                {value.reviewedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t('merchant.services.reviewedAt')}
                    :
                    {' '}
                    {formatDateTime(value.reviewedAt)}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  {value.code}
                </p>
                <ServiceInfo value={value} />
                {value.canProposeUpdate !== true && (
                  <p className="rounded-xl bg-amber-500/10 p-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                    {t(proposalBlockedMessage(value))}
                  </p>
                )}
                <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${value.isActive ? approvalClass(2) : 'bg-muted text-muted-foreground'}`}>
                  {t(`merchant.services.activity.${value.isActive}`)}
                </span>
              </>
            )}
            <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="h-11 px-5 text-base font-semibold"
              >
                {t('common.close')}
              </Button>
              {!proposal && (
                <Button
                  disabled={value.canProposeUpdate !== true || !value.version}
                  onClick={() => onEdit(value)}
                  className="h-11 px-5 text-base font-semibold"
                >
                  <Pencil size={17} />
                  {t('merchant.services.proposeEdit')}
                </Button>
              )}
            </footer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
