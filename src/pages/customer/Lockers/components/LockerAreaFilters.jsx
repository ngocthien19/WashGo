import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { MapPinned, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
export default function LockerAreaFilters({ city, district, hasFilters, onApply, onReset, resource }) {
  const { t } = useTranslation()
  const [selectedCity, setSelectedCity] = useState(city)
  const [selectedDistrict, setSelectedDistrict] = useState(district)
  const { data, loading, error, retry } = resource
  const cities = [...new Set([...(data || []).map((area) => area.city), selectedCity].filter(Boolean))]
  const districts = [...new Set([
    ...(data?.find((area) => area.city === selectedCity)?.districts || []), selectedDistrict
  ].filter(Boolean))]
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <form
        aria-label={t('customer.filterLockersByArea')}
        className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          onApply({ city: selectedCity, district: selectedDistrict })
        }}
      >
        <div className="min-w-0">
          <label
            htmlFor="locker-city"
            className="mb-2 block text-sm font-medium"
          >
            {t('customer.provinceCity')}
          </label>
          <SelectField
            id="locker-city"
            label={t('customer.provinceCity')}
            value={selectedCity}
            disabled={loading || !!error}
            options={[{ value: '', label: loading ? t('customer.loadingAreas') : t('customer.allProvincesCities') }, ...cities.map((value) => ({ value, label: value }))]}
            onValueChange={(value) => {
              setSelectedCity(value)
              setSelectedDistrict('')
            }}
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor="locker-district"
            className="mb-2 block text-sm font-medium"
          >
            {t('customer.district')}
          </label>
          <SelectField
            id="locker-district"
            label={t('customer.district')}
            value={selectedDistrict}
            disabled={loading || !!error || !selectedCity}
            options={[{ value: '', label: selectedCity ? t('customer.allDistricts') : t('customer.chooseAProvinceCityFirst') }, ...districts.map((value) => ({ value, label: value }))]}
            onValueChange={setSelectedDistrict}
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
          variant="secondary"
          className="h-11 rounded-xl"
          disabled={!hasFilters && !selectedCity && !selectedDistrict}
          onClick={() => {
            setSelectedCity('')
            setSelectedDistrict('')
            onReset()
          }}
        >
          <RotateCcw size={15} />
          {t('customer.clearFilters')}
        </Button>
      </form>
      {error && (
        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive"
          role="alert"
        >
          <p>
            {t('customer.unableToLoadAreasYouCanStillSearchFor')}
          </p>
          <Button
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
