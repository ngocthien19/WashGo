import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollText } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import TermsContent from './TermsContent'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import FormError from '~/components/ui/FormError'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerPolicyApi } from '~/apis/customer/customerPolicyApi'
import { formatDateTime } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'

export default function ServiceTerms({ children }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => customerPolicyApi.get(signal), [])
  const resource = useCatalogResource(load)
  const policy = resource.data
  const [manual, setManual] = useState(false)
  const [dismissed, setDismissed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmedVersion, setConfirmedVersion] = useState(null)
  const lock = useRef(false)
  const open = manual || !!(policy?.requiresAcceptance && dismissed !== policy.terms.version)
  const close = () => {
    if (lock.current) {
      return
    }
    setManual(false)
    setConfirmedVersion(null)
    if (policy) {
      setDismissed(policy.terms.version)
    }
  }
  const accept = async () => {
    if (lock.current || !policy || confirmedVersion !== policy.terms.version) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    setDismissed(policy.terms.version); setManual(true)
    try {
      const accepted = await customerPolicyApi.acknowledge(policy.terms.version)
      setDismissed(accepted.terms.version); setManual(false); resource.retry()
    } catch (failure) {
      setError(getApiError(failure)); resource.retry()
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  return (
    <>
      {children(() => {
        setManual(true); setError(''); setConfirmedVersion(null); resource.retry()
      })}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            close()
          }
        }}
      >
        <DialogContent
          closeLabel="common.close"
          className="flex max-w-3xl flex-col overflow-hidden p-0 sm:p-0"
        >
          <div className="shrink-0 border-b border-border bg-primary/5 p-6 pr-14">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <ScrollText className="text-primary" />
              {policy?.terms.title || t('customer.serviceTerms.title')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {t('customer.sync.policyDescription')}
            </DialogDescription>
          </div>
          <div className="min-h-0 grid gap-5 overflow-y-auto p-5 sm:p-6">
            {!policy ? (
              <ResourceFeedback
                {...resource}
                loadingText="common.loading"
              />
            ) : (
              <>
                <TermsContent policy={policy} />
                {policy.accepted && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    {t('customer.sync.acceptedAt', { date: formatDateTime(policy.acceptedAt) })}
                  </p>
                )}
              </>
            )}
            <FormError>
              {error}
            </FormError>
          </div>
          <div className="grid shrink-0 gap-4 border-t border-border bg-card p-5 sm:px-6">
            {policy?.requiresAcceptance && (
              <label className="flex cursor-pointer items-start gap-3 text-sm font-medium leading-6 sm:text-base">
                <Checkbox
                  className="mt-0.5"
                  checked={confirmedVersion === policy.terms.version}
                  onCheckedChange={(checked) => setConfirmedVersion(checked ? policy.terms.version : null)}
                  disabled={busy || resource.loading}
                />
                <span>
                  {t('customer.sync.confirmTerms')}
                </span>
              </label>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                className="h-12 rounded-xl px-4 text-base font-semibold sm:px-6"
                disabled={busy}
                onClick={close}
              >
                {t('common.close')}
              </Button>
              {policy?.requiresAcceptance && (
                <Button
                  className="h-12 rounded-xl px-4 text-base font-semibold sm:px-6"
                  disabled={busy || resource.loading || confirmedVersion !== policy.terms.version}
                  onClick={accept}
                >
                  {t(busy ? 'customer.sync.saving' : 'customer.sync.acceptTerms')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
