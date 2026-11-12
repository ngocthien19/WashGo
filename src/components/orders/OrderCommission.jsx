import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/formats'

export default function OrderCommission({ order }) {
  const { t } = useTranslation()
  const available = Number.isFinite(order.commissionRateApplied) && order.commissionRateApplied >= 0 && order.commissionRateApplied <= 100 && order.commissionStatus !== 'Missing'
  return (
    <section className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <h3 className="border-b border-border pb-3 font-semibold">
        {t('merchant.sync.commissionTitle')}
      </h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {['collectedLaundryAmount', 'refundedAmount', 'commissionOnCollected', 'merchantPayoutOnCollected', 'settledNetAmount', 'unsettledNetAmount'].map((key) => (
          <div key={key}>
            <dt className="text-sm text-muted-foreground">
              {t(`merchant.orderFinance.${key}`)}
            </dt>
            <dd className="mt-1 font-semibold">
              {(!available && ['commissionOnCollected', 'merchantPayoutOnCollected'].includes(key)) || !Number.isFinite(order[key]) ? '—' : formatCurrency(order[key])}
            </dd>
          </div>
        ))}
      </dl>
      {['Unpaid', 'Collected', 'Adjusted', 'Settled'].includes(order.financialStatus) && (
        <p className="mt-3 text-sm font-semibold">
          {t(`merchant.orderFinance.status.${order.financialStatus}`)}
        </p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        {t('merchant.orderFinance.basis')}
      </p>
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
