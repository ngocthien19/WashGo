import { auditResourceCode } from './auditResourceCode'
import ClearFiltersButton from '~/components/ClearFiltersButton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { auditFilterOptions } from './auditFilterOptions'
import { adminSystemSettingApi } from '~/apis/admin/adminSystemSettingApi'
import { History, Eye, ListChecks, ListFilter } from 'lucide-react'
import TruncatedText from '~/components/TruncatedText'
import SuggestedSearch from '~/components/CatalogToolbar/SuggestedSearch'
import { loadSuggestionPages, resourceSuggestion } from '~/utils/search/searchSuggestions'
import { WithTooltip } from '~/components/ui/tooltip'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { adminWorkspaceApi } from '~/apis/admin/adminWorkspaceApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import TablePagination from '~/components/Pagination/TablePagination'
import DateRangeFilter from '~/components/DateRangeFilter/DateRangeFilter'
import { dateRangeFilter } from '~/utils/format/dateRange'
import { formatDateTime } from '~/utils/format/formats'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import { Input } from '~/components/ui/input'
import FormError from '~/components/ui/FormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'

const fields = ['keyword', 'actorRole', 'module', 'action', 'resourceType']
const schema = yup.object({ keyword: yup.string().trim().max(200, 'admin.workspaceSync.filterTooLong') })
const hideInternalIds = (key, value) => ['actorid', 'resourceid'].includes(key.toLowerCase()) ? undefined : value

function AuditDetail({ id, onClose, resourceContext }) {
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
                    {key === 'resourceCode' ? auditResourceCode(row, resourceContext) : row[key]}
                  </TruncatedText>
                </dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt>
                {t('admin.workspaceSync.changedFields')}
              </dt>
              <dd className="mt-2 break-words text-base font-medium">
                {row.changedFields.filter(key => !['actorId', 'resourceId'].includes(key)).join(', ') || '—'}
              </dd>
            </div>
            {row.details && (
              <div className="min-w-0 sm:col-span-2">
                <dt>
                  {t('admin.workspaceSync.auditValues')}
                </dt>
                <dd>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm">
                    {JSON.stringify(row.details, hideInternalIds, 2)}
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
export default function AuditPanel({ personal = false, settings = false, resourceType, resourceId, resourceCode, showRefresh = true, revision = 0, onLoadingChange, compactFilters = false, autoApply = false, tableView = false }) {
  const { t } = useTranslation()
  const resourceContext = { resourceType, resourceId, resourceCode }
  const [query, setQuery] = useState({ page: 1, take: personal ? 5 : 10 }), [detail, setDetail] = useState(null), [dates, setDates] = useState({ from: '', to: '' })
  const resource = useCatalogResource(useCallback(signal => settings ? adminSystemSettingApi.history(query, signal) : adminWorkspaceApi.activities({ ...query, ...(resourceId ? { resourceType, resourceId } : {}) }, personal, signal), [query, personal, settings, resourceType, resourceId]), revision, true)
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({ resolver: yupResolver(schema), mode: 'onChange', defaultValues: Object.fromEntries(fields.map(key => [key, ''])) })
  const [resetVersion, setResetVersion] = useState(0)
  const keyword = useWatch({ control, name: 'keyword' })
  const loadSuggestions = useCallback(async (text, signal) => {
    const load = settings ? adminSystemSettingApi.history : (filter, abortSignal) => adminWorkspaceApi.activities(filter, false, abortSignal)
    const items = await loadSuggestionPages(load, { ...query, ...(resourceId ? { resourceType, resourceId } : {}) }, text, signal)
    return items.map(item => resourceSuggestion(item, 'audit')).filter(Boolean)
  }, [settings, query, resourceType, resourceId])
  useEffect(() => {
    if (!autoApply || keyword.trim().length > 200) {
      return
    }
    const timeout = setTimeout(() => setQuery(current => (current.keyword || '') === keyword.trim() ? current : { ...current, keyword: keyword.trim(), page: 1 }), 350)
    return () => clearTimeout(timeout)
  }, [autoApply, keyword])
  useEffect(() => {
    onLoadingChange?.(resource.loading)
  }, [onLoadingChange, resource.loading])
  return (
    <section
      data-pagination-scope
      className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="-mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="size-5 text-primary" />
          {t(settings ? 'admin.sync.settingsHistory' : personal ? 'admin.profile.activity' : 'admin.workspaceSync.audit')}
        </h2>
        {!personal && showRefresh && (
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
        <div className={`workspace-filters space-y-5 rounded-xl border p-4 sm:p-5 ${compactFilters ? 'border-border bg-white dark:bg-card [&_input]:bg-white dark:[&_input]:bg-card [&_label]:text-sm [&_input]:text-sm [&_button]:text-sm [&_p]:text-sm [&_h3]:text-sm' : 'border-primary/15 bg-primary/3'}`}>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ListFilter className="size-4 text-primary" />
            {t('customer.filters')}
          </h3>
          <form
            onSubmit={event => handleSubmit(values => setQuery(current => ({ ...current, keyword: values.keyword, page: 1 })))(event)}
            className={`grid gap-4 sm:grid-cols-2 ${settings ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
          >
            {fields.filter(key => !(settings && ['module', 'resourceType', 'resourceId'].includes(key)) && !(resourceId && ['resourceType', 'resourceId'].includes(key))).map(key => (
              <label
                key={key}
                className="grid content-start gap-2 text-base font-medium"
              >
                {t(`admin.workspaceSync.auditFields.${key}`)}
                {key === 'keyword' ? (
                  <Controller
                    name="keyword"
                    control={control}
                    render={({ field }) => (
                      <SuggestedSearch
                        key={resetVersion}
                        keyword={field.value}
                        onDraftChange={field.onChange}
                        onSearch={text => {
                          field.onChange(text)
                          setQuery(current => ({ ...current, keyword: text, page: 1 }))
                        }}
                        label={t('admin.workspaceSync.auditFields.keyword')}
                        placeholder={t(settings ? 'admin.workspaceSync.historyKeywordPlaceholder' : 'admin.workspaceSync.auditKeywordPlaceholder')}
                        className="flex min-w-0 items-center rounded-xl border border-border bg-background px-3"
                        loadSuggestions={loadSuggestions}
                        renderForm={false}
                        hideLabel
                        showSearchButton={false}
                      />
                    )}
                  />
                ) : auditFilterOptions(key, '', [], settings) ? (
                  <Controller
                    name={key}
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        label={t(`admin.workspaceSync.auditFields.${key}`)}
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value); setQuery(current => ({ ...current, [key]: value || undefined, page: 1 }))
                        }}
                        className={`text-base font-normal ${compactFilters ? 'bg-primary/3 dark:bg-primary/5' : ''}`}
                        options={[{ value: '', label: t('common.all') }, ...auditFilterOptions(key, field.value, resource.data?.list || [], settings).map(value => ({ value, label: settings && key === 'action' && ['UpdateSla', 'UpdateCommission', 'UpdatePenalty'].includes(value) ? t(`admin.settings.groups.${{ UpdateSla: 'sla', UpdateCommission: 'commission', UpdatePenalty: 'penalty' }[value]}`) : value }))]}
                      />
                    )}
                  />
                ) : (
                  <Input
                    {...register(key)}
                    maxLength={200}
                    className="h-11 text-base font-normal"
                  />
                )}
                <FormError>
                  {errors[key]?.message}
                </FormError>
              </label>
            ))}
            <label className="grid content-start gap-2 text-base font-medium">
              {t('admin.workspaceSync.result')}
              <SelectField
                label={t('admin.workspaceSync.result')}
                value={query.result ? String(query.result) : ''}
                onValueChange={result => setQuery(current => ({ ...current, result: result ? Number(result) : undefined, page: 1 }))}
                className={`text-base font-normal ${compactFilters ? 'bg-primary/3 dark:bg-primary/5' : ''}`}
                options={[{ value: '', label: t('common.all') }, ...[1, 2, 3].map(result => ({ value: String(result), label: t(`admin.workspaceSync.results.${result}`) }))]}
              />
            </label>
            {!autoApply && (
              <div className="flex justify-end sm:col-span-2 lg:col-span-3">
                <Button
                  type="submit"
                  className="h-11 px-5 text-base"
                >
                  <ListFilter className="size-4" />
                  {t('admin.workspaceSync.applyFilters')}
                </Button>
              </div>
            )}
          </form>
          <ClearFiltersButton
            active={keyword || Object.entries(query).some(([key, value]) => !['page', 'take'].includes(key) && value != null && value !== '')}
            onClear={() => {
              setResetVersion(value => value + 1); reset(Object.fromEntries(fields.map(key => [key, '']))); setQuery({ page: 1, take: personal ? 5 : 10, keyword: '' }); setDates({ from: '', to: '' })
            }}
          />
          <DateRangeFilter
            key={`${resetVersion}:${dates.from}:${dates.to}`}
            {...dates}
            label="admin.workspaceSync.auditRange"
            className="space-y-3 border-t border-primary/10 pt-5"
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
          {tableView ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <Table
                aria-label={t(settings ? 'admin.sync.settingsHistory' : 'admin.workspaceSync.audit')}
                className="min-w-[1050px] text-sm"
              >
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    {[['time', 'admin.workspaceSync.auditRange'], ['action', 'admin.workspaceSync.auditFields.action'], ['actor', 'admin.workspaceSync.auditFields.actorName'], ['object', 'admin.workspaceSync.auditFields.resourceCode'], ['reason', 'admin.workspaceSync.auditFields.reason'], ['result', 'admin.workspaceSync.result'], ['details', 'customer.incidents.actions']].map(([key, label]) => (
                      <TableHead
                        key={key}
                        className={key === 'details' ? 'sticky right-0 z-20 w-24 min-w-24 border-l border-border bg-card px-4 text-center dark:bg-card' : 'whitespace-nowrap px-4 py-4'}
                      >
                        {t(label)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!resource.data.list.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {t('admin.noData')}
                      </TableCell>
                    </TableRow>
                  ) : resource.data.list.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                        {formatDateTime(row.occurredAt)}
                      </TableCell>
                      <TableCell className="min-w-44 px-4 py-4 font-semibold">
                        {`${row.module} · ${row.action}`}
                      </TableCell>
                      <TableCell className="min-w-40 max-w-60 px-4 py-4">
                        <TruncatedText>
                          {row.actorName}
                        </TruncatedText>
                        <p className="mt-1 text-muted-foreground">
                          {row.actorRole || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-60 px-4 py-4">
                        <TruncatedText>
                          {auditResourceCode(row, resourceContext)}
                        </TruncatedText>
                      </TableCell>
                      <TableCell className="max-w-72 px-4 py-4">
                        <TruncatedText>
                          {row.reason}
                        </TruncatedText>
                      </TableCell>
                      <TableCell className="min-w-36 px-4 py-4">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${row.result === 1 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : row.result === 2 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                          {t(`admin.workspaceSync.results.${row.result}`)}
                        </span>
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 border-l border-border bg-card text-center">
                        <WithTooltip content={t('admin.workspaceSync.auditDetail')}>
                          <Button
                            variant="secondary"
                            aria-label={t('admin.workspaceSync.auditDetail')}
                            onClick={() => setDetail(row.id)}
                            className="size-10 rounded-xl p-0 text-primary"
                          >
                            <Eye className="size-5" />
                          </Button>
                        </WithTooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : !resource.data.list.length ? (
            <p className="text-muted-foreground">
              {t('admin.noData')}
            </p>
          ) : (
            <ul className={personal ? 'divide-y divide-border' : 'grid gap-4 lg:grid-cols-2'}>
              {resource.data.list.map(row => (
                <li
                  key={row.id}
                  className={personal ? 'min-w-0 space-y-3 py-4' : 'min-w-0 space-y-4 rounded-xl border border-border bg-muted/10 p-4'}
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
                        {auditResourceCode(row, resourceContext)}
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
              compact={personal}
            />
          )}
        </>
      )}
      {detail && (
        <AuditDetail
          id={detail}
          resourceContext={resourceContext}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  )
}
