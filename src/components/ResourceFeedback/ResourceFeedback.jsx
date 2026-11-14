import { resolveMessage } from '~/i18n/messages'
import { useTranslation } from 'react-i18next'
import { PackageSearch, RefreshCw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import Spinner from '~/components/ui/spinner'

export default function CatalogFeedback({
  loading,
  error,
  retry,
  empty = 'customer.noServicesAreAvailableYet',
  loadingText = 'customer.loadingServices'
}) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div
        role="status"
        className="grid min-h-48 place-items-center text-sm text-muted-foreground"
      >
        <div className="flex text-base items-center gap-2">
          <Spinner
            decorative
            className="size-5 text-primary"
          />
          {t(loadingText)}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <PackageSearch className="mx-auto mb-4 size-9 text-muted-foreground" />
      <p
        role={error ? 'alert' : 'status'}
        className="break-words text-sm text-muted-foreground"
      >
        {error ? resolveMessage(error) : t(empty)}
      </p>
      {error && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={retry}
        >
          <RefreshCw size={15} />
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}
