import { useState } from 'react'
import { MapPinned, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
export default function LockerAreaFilters({ city, district, hasFilters, onApply, onReset, resource }) {
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
        aria-label="Lọc khu vực locker"
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
            Tỉnh / Thành phố
          </label>
          <SelectField
            id="locker-city"
            label="Tỉnh / Thành phố"
            value={selectedCity}
            disabled={loading || !!error}
            options={[{ value: '', label: loading ? 'Đang tải khu vực...' : 'Tất cả tỉnh / thành phố' }, ...cities.map((value) => ({ value, label: value }))]}
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
            Quận / Huyện
          </label>
          <SelectField
            id="locker-district"
            label="Quận / Huyện"
            value={selectedDistrict}
            disabled={loading || !!error || !selectedCity}
            options={[{ value: '', label: selectedCity ? 'Tất cả quận / huyện' : 'Chọn tỉnh / thành phố trước' }, ...districts.map((value) => ({ value, label: value }))]}
            onValueChange={setSelectedDistrict}
          />
        </div>
        <Button
          type="submit"
          className="h-11 rounded-xl"
          disabled={loading || !!error}
        >
          <MapPinned size={16} />
          Áp dụng
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
          Xóa bộ lọc
        </Button>
      </form>
      {error && (
        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive"
          role="alert"
        >
          <p>
            Không tải được danh sách khu vực. Bạn vẫn có thể tìm locker theo địa chỉ.
          </p>
          <Button
            variant="outline"
            onClick={retry}
          >
            <RefreshCw size={15} />
            Thử lại
          </Button>
        </div>
      )}
    </div>
  )
}
