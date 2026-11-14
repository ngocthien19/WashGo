import { useMemo } from 'react'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import { customerSuggestionLoader } from '~/apis/customer/customerSearchSuggestions'

export default function CustomerCatalogToolbar({ suggestionType, suggestionFilter = {}, ...props }) {
  const filterKey = JSON.stringify(suggestionFilter)
  const loadSuggestions = useMemo(() => suggestionType ? customerSuggestionLoader(suggestionType, JSON.parse(filterKey)) : undefined, [suggestionType, filterKey])
  return (
    <CatalogToolbar
      {...props}
      loadSuggestions={loadSuggestions}
    />
  )
}
