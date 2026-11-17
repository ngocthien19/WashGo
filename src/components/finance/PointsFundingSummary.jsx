import { useTranslation } from 'react-i18next'
import { formatCurrency } from '~/utils/format/formats'

export default function PointsFundingSummary({ value }) {
  const { t } = useTranslation()
  const fields = ['pointsFunding', 'netCash', 'netGatewayCash', 'platformCommissionAfterPoints'].filter(key => Number.isFinite(value?.[key]) && !(key === 'platformCommissionAfterPoints' && value.commissionComplete === false))
  if (!fields.length) {
    return null
  }
  return (
    <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(key => (
          <div key={key}>
            <dt className="text-sm text-muted-foreground">
              {t(`loyalty.${key}`)}
            </dt>
            <dd className="mt-1 font-bold tabular-nums">
              {formatCurrency(value[key])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs leading-6 text-muted-foreground">
        {t('loyalty.fundingHint')}
      </p>
    </div>
  )
}
