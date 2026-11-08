import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/formats'

export default function OrderCommission({ order }) {
  const { t } = useTranslation()
  // The current backend uses zero for both legacy orders and a genuine 0% rate.
  const available = Number.isFinite(order.commissionRateApplied) && order.commissionRateApplied > 0 && order.commissionRateApplied <= 100
  return (
    <section className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <h3 className="border-b border-border pb-3 font-semibold">
        {t('merchant.sync.commissionTitle')}
      </h3>
      {!available ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('merchant.sync.commissionUnknown')}
        </p>
      ) : (
        <>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {[['commissionRate', `${formatNumber(order.commissionRateApplied)}%`], ['commissionBase', order.commissionBaseAmount], ['commissionAmount', order.commissionAmount], ['orderNet', order.merchantNetAmount]].map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm text-muted-foreground">
                  {t(`merchant.sync.${key}`)}
                </dt>
                <dd className="mt-1 font-semibold">
                  {key === 'commissionRate' ? value : Number.isFinite(value) ? formatCurrency(value) : '—'}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t('merchant.sync.commissionEstimate')}
          </p>
        </>
      )}
    </section>
  )
}
