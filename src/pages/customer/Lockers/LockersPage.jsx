import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import LocationButton from '~/components/maps/LocationButton'
import { SelectField } from '~/components/ui/select'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { ArrowDownAZ, Check, ChevronDown, LocateFixed, MapPinned, MapPinOff } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import LockerResultSummary from './components/LockerResultSummary'
import { Button } from '~/components/ui/button'
import LockerAreaFilters from './components/LockerAreaFilters'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import LockerResults from '~/components/customer/lockers/LockerResults'
import Pagination from '~/components/Pagination/Pagination'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_CATALOG, CUSTOMER_ROUTES, NEARBY_LOCKERS, UI_TRANSITIONS } from '~/utils/config/constants'

export default function LockersPage() {
  const { t } = useTranslation()
  const { position, locating, locationError, requestLocation } = useOutletContext()
  const [radiusKm, setRadiusKm] = useState(null)
  const nearby = radiusKm !== null
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const [sort, setSort] = useState('name')
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => {
    const page = Number(params.get('page'))
    return {
      keyword: params.get('keyword')?.trim() || '',
      city: params.get('city')?.trim() || '',
      page: Number.isSafeInteger(page) && page > 0 ? page : CUSTOMER_CATALOG.INITIAL_PAGE
    }
  }, [params])
  const load = useCallback((signal) => customerCatalogApi.getLockers({
    page: query.page, take: CUSTOMER_CATALOG.PAGE_SIZE,
    keyword: query.keyword || undefined, city: query.city || undefined,
    ...(sort === 'nearest' ? position : {}),
    ...(position && radiusKm !== null ? { radiusKm } : {})
  }, signal), [query, sort, position, radiusKm])
  const { data, loading, error, retry } = useCatalogResource(load)
  const areas = useCatalogResource(customerCatalogApi.getLockerAreas)
  const lockers = data?.list || []
  const nextRadius = NEARBY_LOCKERS.RADII_KM.find(value => value > radiusKm)
  const hasFilters = !!(query.keyword || query.city)
  useEffect(() => {
    if (params.has('district')) {
      setParams((current) => {
        const search = new URLSearchParams(current)
        search.delete('district')
        search.delete('page')
        return search
      }, { replace: true })
    }
  }, [params, setParams])
  const setQuery = (update) => {
    setParams((current) => {
      const search = new URLSearchParams(current)
      for (const [key, value] of Object.entries(update)) {
        if (value && (key !== 'page' || value > CUSTOMER_CATALOG.INITIAL_PAGE)) {
          search.set(key, String(value))
        } else {
          search.delete(key)
        }
      }
      return search
    })
  }
  const useNearest = () => {
    if (position) {
      setSort('nearest')
      setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
    }
  }

  useEffect(() => {
    document.title = t('customer.allLockersWashgo')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [t])

  const sortControl = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <Button
            variant="outline"
            className="group h-11 min-w-36 justify-between rounded-xl text-sm font-semibold px-4"
          />
        )}
        aria-label={t('customer.sortLockers')}
        disabled={locating}
      >
        {sort === 'nearest' ? t('customer.nearest') : t('customer.nameAZ')}
        <ChevronDown className={`size-4 group-data-[popup-open]:rotate-180 ${UI_TRANSITIONS.ICON}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          aria-current={sort === 'name' ? 'true' : undefined}
          onClick={() => {
            setSort('name')
            setRadiusKm(null)
            setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
          }}
        >
          <ArrowDownAZ size={16} />
          {t('customer.nameAZ')}
          {sort === 'name' && (
            <Check className="ml-auto size-4 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          aria-current={sort === 'nearest' ? 'true' : undefined}
          disabled={!position}
          onClick={useNearest}
        >
          <LocateFixed size={16} />
          {t('customer.nearest')}
          {sort === 'nearest' && (
            <Check className="ml-auto size-4 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="min-h-[70dvh] overflow-x-clip bg-muted/35">
      <div className="mx-auto max-w-7xl space-y-7 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.allLockers') }]}
        />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <SectionHeading
            as="h1"
            title={t('customer.findYourLocker')}
            description={t('customer.chooseAConvenientDropOffPointAndCheckAvailable')}
            icon={MapPinned}
          />
          <LocationButton
            locating={locating}
            onClick={async () => {
              const next = await requestLocation()
              if (next && active.current) {
                setSort('nearest')
                setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
              }
            }}
          />
        </div>
        <LockerAreaFilters
          key={query.city}
          city={query.city}
          search={(
            <CatalogToolbar
              showLabel
              suggestionType="locker"
              suggestionFilter={{ city: query.city || undefined }}
              embedded
              keyword={query.keyword}
              label={t('customer.searchLockers')}
              placeholder={t('customer.searchByLockerNameCodeOrAddress')}
              onSearch={(keyword) => setQuery({ keyword, page: CUSTOMER_CATALOG.INITIAL_PAGE })}
            />
          )}
          hasFilters={hasFilters}
          resource={areas}
          onApply={(areas) => setQuery({ ...areas, page: CUSTOMER_CATALOG.INITIAL_PAGE })}
          onReset={() => setQuery({ keyword: '', city: '', page: CUSTOMER_CATALOG.INITIAL_PAGE })}
        />
        {locationError && (
          <p
            role="alert"
            className="text-sm text-amber-800 dark:text-amber-300"
          >
            {t(locationError)}
          </p>
        )}
        <section
          data-pagination-scope
          aria-label={t('customer.lockerSearchResults')}
          aria-busy={loading}
          className="scroll-mt-[var(--customer-header-offset)] space-y-5"
        >
          <LockerResultSummary
            data={data}
            loading={loading}
            error={error}
            query={query}
            sortControl={sortControl}
            radiusControl={(
              <div className="flex flex-wrap items-center gap-2.5">
                <label
                  htmlFor="locker-radius"
                  className="text-muted-foreground"
                >
                  {t('nearbyLockers.radius')}
                </label>
                <div className="w-36">
                  <SelectField
                    id="locker-radius"
                    className="font-semibold"
                    label={t('nearbyLockers.radius')}
                    disabled={!position || locating}
                    value={radiusKm === null ? 'all' : String(radiusKm)}
                    onValueChange={value => {
                      setRadiusKm(value === 'all' ? null : Number(value))
                      if (value !== 'all') {
                        setSort('nearest')
                      }
                      setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
                    }}
                    options={[
                      { value: 'all', label: t('common.all') },
                      ...NEARBY_LOCKERS.RADII_KM.map(value => ({ value: String(value), label: `${value} km` }))
                    ]}
                  />
                </div>
              </div>
            )}
            onRemoveFilter={(id) => setQuery({
              [id]: '', page: CUSTOMER_CATALOG.INITIAL_PAGE
            })}
            onClearFilters={() => setQuery({ keyword: '', city: '', page: CUSTOMER_CATALOG.INITIAL_PAGE })}
          />
          {!loading && !error && nearby && !lockers.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-primary/20 bg-card px-6 py-10 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MapPinOff
                  className="size-8"
                  aria-hidden="true"
                />
              </span>
              <p
                role="status"
                className="max-w-xl text-base font-medium leading-7"
              >
                {t('nearbyLockers.empty', { radius: radiusKm })}
              </p>
              {nextRadius && (
                <Button
                  className="h-12 rounded-xl px-6 text-base font-semibold"
                  onClick={() => {
                    setRadiusKm(nextRadius); setQuery({ page: CUSTOMER_CATALOG.INITIAL_PAGE })
                  }}
                >
                  {t('nearbyLockers.expand', { radius: nextRadius })}
                </Button>
              )}
            </div>
          ) : loading || error || !lockers.length ? (
            <CatalogFeedback
              loading={loading}
              loadingText={t('customer.loadingLockers')}
              error={error}
              retry={retry}
              empty={hasFilters ? t('customer.noLockersMatchTryAnotherKeywordOrArea') : t('customer.noLockersAreAvailableRightNow')}
            />
          ) : (
            <LockerResults
              lockers={lockers}
              position={position}
            />
          )}
          {!loading && !error && data?.totalPages > 0 && (
            <Pagination
              className="pt-5"
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={(page) => {
                setQuery({ page })
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}
