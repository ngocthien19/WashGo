import { useCallback } from 'react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminComplaintApi } from '~/apis/admin/adminComplaintApi'
export default function useComplaintContacts(incident) {
  const load = useCallback(signal => incident ? adminComplaintApi.contacts(incident, signal) : Promise.resolve(null), [incident])
  return useCatalogResource(load)
}
