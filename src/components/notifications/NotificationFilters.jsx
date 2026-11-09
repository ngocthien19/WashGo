import { useTranslation } from 'react-i18next'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import { SelectField } from '~/components/ui/select'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import { CUSTOMER_NOTIFICATION_TYPES } from './notificationModel'

export default function NotificationFilters({ params, change, types = CUSTOMER_NOTIFICATION_TYPES, className = '' }) {
  const { t } = useTranslation()
  return (
    <div className={`grid gap-4 rounded-2xl border border-border bg-card p-5 font-medium shadow-sm ${className}`}>
      <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2 sm:col-span-2 xl:col-span-1">
          <span className="text-sm font-medium">
            {t('notificationNav.search')}
          </span>
          <CatalogToolbar
            embedded
            label={t('customer.sync.searchNotifications')}
            placeholder={t('customer.sync.searchNotifications')}
            keyword={params.get('keyword') || ''}
            onSearch={(keyword) => change({ keyword })}
            formClassName="h-11 py-0.5"
          />
        </div>
        <label className="grid gap-2 text-sm font-medium">
          <span>
            {t('customer.sync.sort')}
          </span>
          <SelectField
            label={t('customer.sync.sort')}
            value={params.get('sort') || 'newest'}
            onValueChange={(sort) => change({ sort })}
            options={['newest', 'oldest', 'unreadFirst'].map((value) => ({ value, label: t(`customer.sync.sorts.${value}`) }))}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span>
            {t('customer.sync.notificationType')}
          </span>
          <SelectField
            label={t('customer.sync.notificationType')}
            value={types.includes(Number(params.get('type'))) ? params.get('type') : ''}
            onValueChange={(type) => change({ type })}
            options={[{ value: '', label: t('common.all') }, ...types.map((value) => ({ value: String(value), label: t(`customer.sync.notificationTypes.${value}`) }))]}
          />
        </label>
      </div>
      <DateRangeFilter
        key={`${params.get('from')}-${params.get('to')}`}
        from={params.get('from') || ''}
        to={params.get('to') || ''}
        onApply={change}
        label="customer.sync.notificationDates"
        className="grid gap-3 border-t border-border pt-4"
      />
    </div>
  )
}
