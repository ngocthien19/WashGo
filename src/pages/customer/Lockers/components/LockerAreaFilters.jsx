import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { MapPinned, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
export default function LockerAreaFilters({ city, hasFilters, onApply, onReset, resource, search }) {
  const { t } = useTranslation()
  const [selectedCity, setSelectedCity] = useState(city)
  const { data, loading, error, retry } = resource
  const cities = [...new Set([...(data || []).map((area) => area.city), selectedCity].filter(Boolean))]
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {search}
        <form
          aria-label={t('customer.filterLockersByArea')}
          className="grid items-center gap-2 sm:grid-cols-[minmax(10rem,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            onApply({ city: selectedCity })
          }}
        >
          <div className="relative min-w-0 max-sm:col-span-2">
            <label
              htmlFor="locker-city"
              className="absolute -top-2 left-3 z-10 bg-card px-1 text-xs text-muted-foreground"
            >
              {t('customer.provinceCity')}
            </label>
            <SelectField
              id="locker-city"
              label={t('customer.provinceCity')}
              value={selectedCity}
              disabled={loading || !!error}
              options={[{ value: '', label: loading ? t('customer.loadingAreas') : t('customer.allProvincesCities') }, ...cities.map((value) => ({ value, label: value }))]}
              onValueChange={setSelectedCity}
            />
          </div>
          <Button
            type="submit"
            className="h-11 rounded-xl"
            disabled={loading || !!error}
          >
            <MapPinned size={16} />
            {t('customer.apply')}
          </Button>
          <Button
            variant="destructive"
            className="h-11 rounded-xl"
            disabled={!hasFilters && !selectedCity}
            onClick={() => {
              setSelectedCity('')
              onReset()
            }}
          >
            <RotateCcw size={15} />
            {t('customer.clearFilters')}
          </Button>
        </form>
      </div>
      {error && (
        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive"
          role="alert"
        >
          <p>
            {t('customer.unableToLoadAreasYouCanStillSearchFor')}
          </p>
          <Button
            className="h-11 text-base px-4"
            variant="outline"
            onClick={retry}
          >
            <RefreshCw size={15} />
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
    </div>
  )
}
