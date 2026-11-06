import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ScrollText, ShoppingBag, Ban, Undo2, KeyRound, MessageSquareWarning, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { markServiceTermsSeen } from '~/redux/preferences/preferencesSlice'

const sections = [
  ['booking', ShoppingBag], ['cancellation', Ban], ['refund', Undo2],
  ['pickup', KeyRound], ['complaints', MessageSquareWarning]
]

export default function ServiceTerms({ userId, children }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const seen = useSelector((state) => state.preferences?.serviceTermsSeen?.[userId])
  const [open, setOpen] = useState(() => Boolean(userId && !seen))
  const changeOpen = (next) => {
    setOpen(next)
    if (!next && userId && !seen) {
      dispatch(markServiceTermsSeen(userId))
    }
  }
  return (
    <>
      {children(() => setOpen(true))}
      <Dialog
        open={open}
        onOpenChange={changeOpen}
      >
        <DialogContent
          closeLabel="common.close"
          className="flex max-w-3xl flex-col overflow-hidden p-0 sm:p-0"
        >
          <div className="shrink-0 border-b border-border bg-gradient-to-br from-primary/10 to-card p-6 pr-14">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <ScrollText className="text-primary" />
              {t('customer.serviceTerms.title')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('customer.serviceTerms.description')}
            </DialogDescription>
          </div>
          <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-6">
            <div className="flex gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>
                {t('customer.serviceTerms.intro')}
              </p>
            </div>
            {sections.map(([name, Icon], index) => (
              <section
                key={name}
                className="space-y-3"
              >
                <h2 className="flex items-center gap-2 border-b border-border pb-3 text-base font-bold">
                  <Icon className="size-5 text-primary" />
                  <span>
                    {`${index + 1}. ${t(`customer.serviceTerms.${name}.title`)}`}
                  </span>
                </h2>
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {t(`customer.serviceTerms.${name}.body`)}
                </p>
                {name === 'cancellation' && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    {['pending', 'late', 'deposited', 'collected', 'processing'].map((stage) => (
                      <div
                        key={stage}
                        className="grid gap-1 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
                      >
                        <p className="text-sm font-semibold">
                          {t(`customer.serviceTerms.cancellation.${stage}.label`)}
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {t(`customer.serviceTerms.cancellation.${stage}.value`)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {name === 'cancellation' && (
                  <p className="rounded-xl bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 dark:text-amber-200">
                    {t('customer.serviceTerms.cancellation.configNote')}
                  </p>
                )}
              </section>
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 p-5">
            <p className="text-xs text-muted-foreground">
              {t('customer.serviceTerms.footerNote')}
            </p>
            <Button
              className="h-11 rounded-xl px-6"
              onClick={() => changeOpen(false)}
            >
              {t('customer.serviceTerms.understood')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
