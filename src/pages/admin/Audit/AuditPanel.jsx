import { History, Eye, ListChecks } from 'lucide-react'
import TruncatedText from '~/components/TruncatedText'
import { WithTooltip } from '~/components/ui/tooltip'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { adminWorkspaceApi } from '~/apis/admin/adminWorkspaceApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import { dateRangeFilter } from '~/utils/dateRange'
import { formatDateTime } from '~/utils/formats'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'

const fields = ['keyword', 'actorId', 'actorRole', 'module', 'action', 'resourceType', 'resourceId']
const schema = yup.object(Object.fromEntries(fields.map(key => [key, key === 'actorId' ? yup.string().test('id', 'admin.workspaceSync.invalidId', value => !value || /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) : yup.string().trim().max(200, 'admin.workspaceSync.filterTooLong')])))
function AuditDetail({ id, onClose }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(useCallback(signal => adminWorkspaceApi.activity(id, signal), [id]))
  const row = resource.data
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        ready={!resource.loading}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <ListChecks />
            {t('admin.workspaceSync.auditDetail')}
          </DialogTitle>
          <DialogDescription className="mt-4">
            {row ? `${row.module} · ${row.action}` : t('admin.loading')}
          </DialogDescription>
        </DialogHeader>
        {resource.error || !row ? <ResourceFeedback {...resource} /> : (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {['actorName', 'actorRole', 'resourceType', 'resourceCode', 'reason', 'errorCode', 'correlationId'].map(key => (
              <div
                key={key}
                className="min-w-0 rounded-xl border border-border bg-muted/20 p-3"
              >
                <dt className="text-sm text-muted-foreground">
                  {t(`admin.workspaceSync.auditFields.${key}`)}
                </dt>
                <dd className="mt-2 break-words text-base font-medium">
                  <TruncatedText>
                    {row[key]}
                  </TruncatedText>
                </dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt>
                {t('admin.workspaceSync.changedFields')}
              </dt>
              <dd className="mt-2 break-words text-base font-medium">
                {row.changedFields.join(', ') || '—'}
              </dd>
            </div>
            {row.details && (
              <div className="min-w-0 sm:col-span-2">
                <dt>
                  {t('admin.workspaceSync.auditValues')}
                </dt>
                <dd>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm">
                    {JSON.stringify(row.details, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        )}
        <footer className="mt-5 flex justify-end border-t border-border pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            className="h-11 px-5 text-base"
          >
            {t('common.close')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
export default function AuditPanel({ personal = false }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ page: 1, take: personal ? 5 : 10 }), [detail, setDetail] = useState(null), [dates, setDates] = useState({ from: '', to: '' })
  const resource = useCatalogResource(useCallback(signal => adminWorkspaceApi.activities(query, personal, signal), [query, personal]), 0, true)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: Object.fromEntries(fields.map(key => [key, ''])) })
  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="-mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="size-5 text-primary" />
          {t(personal ? 'admin.profile.activity' : 'admin.workspaceSync.audit')}
        </h2>
        {!personal && (
          <Button
            variant="outline"
            onClick={resource.retry}
            className="h-11 px-4 text-base"
          >
            {t('customer.orders.refresh')}
          </Button>
        )}
      </div>
      {!personal && (
        <div className="workspace-filters space-y-4 rounded-xl border border-border bg-muted/20 p-4">
          <form
            onSubmit={event => handleSubmit(values => setQuery(current => ({ ...current, ...values, page: 1 })))(event)}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {fields.map(key => (
              <label
                key={key}
                className="grid gap-2 text-sm"
              >
                {t(`admin.workspaceSync.auditFields.${key}`)}
                <Input
                  {...register(key)}
                  maxLength={200}
                  className="h-11 text-base"
                />
                <FormError>
                  {errors[key]?.message}
                </FormError>
              </label>
            ))}
            <Button
              type="submit"
              className="h-11 self-end px-5 text-base"
            >
              {t('admin.workspaceSync.applyFilters')}
            </Button>
          </form>
          <label className="grid max-w-xs gap-2">
            {t('admin.workspaceSync.result')}
            <select
              aria-label={t('admin.workspaceSync.result')}
              className="h-11 rounded-xl border border-border bg-card px-3"
              value={query.result || ''}
              onChange={event => setQuery(current => ({ ...current, result: event.target.value ? Number(event.target.value) : undefined, page: 1 }))}
            >
              <option value="">
                {t('common.all')}
              </option>
              {[1, 2, 3].map(result => (
                <option
                  key={result}
                  value={result}
                >
                  {t(`admin.workspaceSync.results.${result}`)}
                </option>
              ))}
            </select>
          </label>
          <DateRangeFilter
            {...dates}
            label="admin.workspaceSync.auditRange"
            onApply={range => {
              setDates(range); setQuery(current => ({ ...current, ...dateRangeFilter(range), page: 1 }))
            }}
          />
        </div>
      )}
      {resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="admin.loading"
        />
      ) : (
        <>
          {!resource.data.list.length ? (
            <p className="text-muted-foreground">
              {t('admin.noData')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {resource.data.list.map(row => (
                <li
                  key={row.id}
                  className="min-w-0 space-y-3 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 font-semibold">
                      {`${row.module} · ${row.action}`}
                    </p>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${row.result === 1 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : row.result === 2 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                      {t(`admin.workspaceSync.results.${row.result}`)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1 text-sm leading-6 text-muted-foreground">
                      <time className="block">
                        {formatDateTime(row.occurredAt)}
                      </time>
                      <TruncatedText>
                        {row.actorName}
                      </TruncatedText>
                      <TruncatedText>
                        {row.resourceCode || row.resourceType}
                      </TruncatedText>
                      {row.reason && (
                        <TruncatedText className="text-foreground">
                          {row.reason}
                        </TruncatedText>
                      )}
                    </div>
                    <WithTooltip content={t('admin.workspaceSync.auditDetail')}>
                      <Button
                        variant="secondary"
                        aria-label={t('admin.workspaceSync.auditDetail')}
                        onClick={() => setDetail(row.id)}
                        className="size-10 shrink-0 rounded-xl p-0 text-primary"
                      >
                        <Eye className="size-5" />
                      </Button>
                    </WithTooltip>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {resource.data.total > 0 && (
            <TablePagination
              disabled={resource.loading}
              currentPage={query.page}
              totalPages={Math.ceil(resource.data.total / query.take)}
              total={resource.data.total}
              pageSize={query.take}
              rowCount={resource.data.list.length}
              onPageChange={page => setQuery(current => ({ ...current, page }))}
              className="px-0 pb-2"
            />
          )}
        </>
      )}
      {detail && (
        <AuditDetail
          id={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  )
}
