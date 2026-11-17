import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { customerLoyaltyApi } from '~/apis/customer/customerLoyaltyApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { formatCurrency, formatNumber } from '~/utils/format/formats'

export default function LoyaltyPaymentChoice({ orderId, disabled, onChange }) {
  const { t } = useTranslation()
  const [requested, setRequested] = useState(0)
  const resource = useCatalogResource(useCallback(signal => customerLoyaltyApi.quote(orderId, requested, signal), [orderId, requested]))
  const quote = !resource.loading && !resource.error ? resource.data : null
  const dirty = !quote || requested !== quote.pointsToRedeem
  useEffect(() => {
    onChange({ quote, dirty, loading: resource.loading })
  }, [quote, dirty, resource.loading, onChange])
  const toggle = (event) => {
    if (disabled || resource.loading || event.target.checked && !quote?.maximumPoints) {
      return
    }
    onChange({ quote: null, dirty: true, loading: true })
    setRequested(event.target.checked ? quote.maximumPoints : 0)
  }
  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <label className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-5 text-primary" />
          {t('loyalty.usePoints')}
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            role="switch"
            aria-label={t('loyalty.usePoints')}
            checked={requested > 0}
            disabled={disabled || resource.loading || requested === 0 && !quote?.maximumPoints}
            onChange={toggle}
            className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            aria-hidden="true"
            className="h-7 w-12 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-disabled:opacity-50 motion-reduce:transition-none"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 peer-disabled:opacity-70 motion-reduce:transition-none"
          />
        </span>
      </label>
      {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : quote && (
        <>
          <p className="text-sm text-muted-foreground">
            {t('loyalty.quoteLimit', { available: formatNumber(quote.availablePoints), maximum: formatNumber(quote.maximumPoints) })}
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {t('loyalty.gatewayAmount')}
              </dt>
              <dd className="mt-1 text-lg font-bold text-primary">
                {formatCurrency(quote.cashAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t('loyalty.expectedEarnedPoints')}
              </dt>
              <dd className="mt-1 text-lg font-bold">
                {formatNumber(quote.expectedEarnedPoints)}
              </dd>
            </div>
          </dl>
        </>
      )}
      {quote && requested > 0 && (
        <p
          role="status"
          className="text-sm font-semibold text-primary"
        >
          {t('loyalty.switchApplied', { points: formatNumber(quote.pointsToRedeem) })}
        </p>
      )}
    </section>
  )
}
