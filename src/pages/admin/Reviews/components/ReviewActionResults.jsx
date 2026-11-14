import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function ReviewActionResults({ items, onDismiss }) {
  const { t } = useTranslation()
  return (
    <section
      role="status"
      className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          {t('admin.reviews.resultsTitle')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.close')}
          onClick={onDismiss}
        >
          <X />
        </Button>
      </div>
      <ul className="max-h-56 space-y-2 overflow-y-auto">
        {items.map(item => (
          <li
            key={item.id}
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            <strong>
              {item.orderCode || '—'}
            </strong>
            <span className={item.succeeded ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
              {t(`admin.reviews.outcomes.${['Changed', 'Unchanged', 'Skipped', 'Failed'].includes(item.outcome) ? item.outcome : item.succeeded ? 'Succeeded' : 'Failed'}`)}
            </span>
            {item.message && (
              <span>
                {item.message}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
