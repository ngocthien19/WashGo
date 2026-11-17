import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { categoryLookup } from '~/apis/categories/categoryLookupApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { SelectField } from '~/components/ui/select'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'

export default function CategorySelect({ role = 'Admin', value, onChange, current, disabled, includeInactive = false, filter = false, onReady }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(useCallback(signal => categoryLookup(role, signal, includeInactive), [role, includeInactive]))
  useEffect(() => {
    onReady?.(!resource.loading && !resource.error)
  }, [resource.loading, resource.error, onReady])
  const options = (resource.data || []).map(row => ({ value: row.id, label: `${row.name}${row.isActive ? '' : ` (${t('categories.inactive')})`}` }))
  if (value && !options.some(row => row.value === value)) {
    options.push({ value, label: `${current?.categoryName || t('categories.unavailable')} (${t('categories.unavailable')})` })
  }
  return (
    <div className="grid gap-2">
      <SelectField
        label={t('categories.category')}
        value={value || ''}
        onValueChange={onChange}
        disabled={disabled || resource.loading || !!resource.error}
        options={[{ value: '', label: t(filter ? 'common.all' : 'categories.choose') }, ...options]}
      />
      {(resource.loading || resource.error) && <ResourceFeedback {...resource} />}
    </div>
  )
}
