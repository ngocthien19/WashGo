import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { validRange } from '~/utils/format/dateRange'

export default function DateRangeFilter({ from, to, onApply, label = 'merchant.orders.createdRange', className = 'space-y-3 border-t border-border pt-4 sm:col-span-2 xl:col-span-3' }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({ from, to })
  const [error, setError] = useState(false)
  return (
    <form
      noValidate
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        if (!event.currentTarget.checkValidity() || !validRange(draft.from, draft.to)) {
          setError(true); return
        }
        setError(false)
        onApply(draft)
      }}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CalendarDays
          size={16}
          className="text-primary"
        />
        {t(label)}
      </p>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        {['from', 'to'].map((key) => (
          <label
            key={key}
            className="grid min-w-0 gap-2 text-sm text-muted-foreground"
          >
            <span>
              {t(`merchant.orders.${key}Day`)}
            </span>
            <Input
              type="date"
              aria-label={t(`merchant.orders.${key}Day`)}
              value={draft[key]}
              min="1970-01-02"
              onChange={(event) => {
                setDraft({ ...draft, [key]: event.target.value }); setError(false)
              }}
              className="h-11 min-w-0 rounded-xl text-base text-foreground [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
        ))}
        <Button
          type="submit"
          className="h-11 px-5 text-base"
        >
          {t('merchant.orders.applyDate')}
        </Button>
        {(draft.from || draft.to || from || to) && (
          <Button
            type="button"
            variant="secondary"
            className="h-11 px-4 text-base"
            onClick={() => {
              setDraft({ from: '', to: '' }); setError(false); onApply({ from: '', to: '' })
            }}
          >
            {t('merchant.orders.clearDate')}
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {t('merchant.orders.invalidRange')}
        </p>
      )}
    </form>
  )
}
