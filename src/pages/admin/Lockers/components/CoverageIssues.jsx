import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Store, AlertTriangle, Pencil } from 'lucide-react'
import { adminLockerApi } from '~/apis/admin/adminLockerApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import { Button } from '~/components/ui/button'

export default function CoverageIssues({ onEdit, revision }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const load = useCallback(signal => adminLockerApi.coverageIssues(page, signal), [page])
  const resource = useCatalogResource(load, revision)
  if (!resource.loading && !resource.error && !resource.data?.total) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"
      >
        {t('coverage.noIssues')}
      </p>
    )
  }
  return (
    <section
      className="space-y-4"
      data-pagination-scope
    >
      {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : (
        <>
          <ul className="space-y-4">
            {resource.data.list.map(row => (
              <li
                key={`${row.lockerId}:${row.merchantId}`}
                className="flex flex-col gap-5 rounded-2xl border border-amber-500/25 border-l-4 border-l-amber-500 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="min-w-0 space-y-3">
                  <p className="flex items-start gap-2 text-base font-semibold">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-primary"
                    />
                    <span className="break-words">
                      {row.lockerName}
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {row.lockerCode}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Store
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    {row.businessName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">
                      {row.distanceKm ?? '—'}
                      {' '}
                      km /
                      {' '}
                      {row.serviceRadiusKm}
                      {' '}
                      km
                    </span>
                    {' · '}
                    {' '}
                    {t(`coverage.reasons.${row.reasonCode}`, { defaultValue: t('coverage.invalid') })}
                  </p>
                  {!row.lockerStillServed && (
                    <p className="flex items-start gap-2 rounded-lg bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive">
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0"
                      />
                      {t('coverage.unserved')}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="h-12 w-full shrink-0 gap-2 rounded-xl px-5 text-sm font-medium sm:w-auto"
                  onClick={() => onEdit(row.lockerId)}
                >
                  <Pencil
                    aria-hidden="true"
                    className="size-4"
                  />
                  {t('coverage.edit')}
                </Button>
              </li>
            ))}
          </ul>
          {resource.data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={resource.data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </section>
  )
}
