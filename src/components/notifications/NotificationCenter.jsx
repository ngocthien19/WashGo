import NotificationFilters from './NotificationFilters'
import { notificationFilters, CUSTOMER_NOTIFICATION_TYPES } from './notificationModel'
import { NOTIFICATION_CATEGORIES } from './notificationCatalog'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { List, Mail, Inbox, Package, Wallet, MessageSquareWarning, Undo2, Star, Shirt, Store, Truck } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useNotifications } from './NotificationContext'
import NotificationInbox from './NotificationInbox'
import useCatalogResource from '~/hooks/useCatalogResource'
import { notificationApi } from '~/apis/notificationApi'
import { loadSuggestionPages, resourceSuggestion } from '~/utils/searchSuggestions'
const categoryIcons = { order: Package, payment: Wallet, feedback: MessageSquareWarning, refunds: Undo2, ratings: Star, services: Shirt, merchant: Store, tasks: Truck }

export default function NotificationCenter({ stickyClassName = 'lg:top-24', advanced = false, types = CUSTOMER_NOTIFICATION_TYPES, descriptionKey = 'customer.notification.description', filterClassName, loadSuggestions, showResultCount = true }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const unreadOnly = params.get('unread') === 'true'
  const { unread, revision, categories = NOTIFICATION_CATEGORIES.Customer } = useNotifications()
  const loadCounts = useCallback(signal => advanced ? notificationApi.categoryCounts(categories, signal) : Promise.resolve([]), [advanced, categories])
  const categoryCounts = useCatalogResource(loadCounts, revision, true)
  const activeCategory = categories.find(item => item.id === params.get('group'))
  const activeTypes = activeCategory ? types.filter(type => activeCategory.types.includes(type)) : types
  const [counts, setCounts] = useState([])
  const total = counts.length ? counts.reduce((sum, item) => sum + item.total, 0) : null
  const filters = useMemo(() => advanced ? notificationFilters(params, types, categories) : undefined, [advanced, params, types, categories])
  const suggestions = useMemo(() => async (keyword, signal) => {
    const items = await loadSuggestionPages(notificationApi.filter, { ...filters, unreadOnly }, keyword, signal)
    return items.map(item => resourceSuggestion(item)).filter(Boolean)
  }, [filters, unreadOnly])
  const updateFilters = (patch) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(patch)) {
      if (value !== '' && value != null) {
        next.set(key, String(value))
      } else {
        next.delete(key)
      }
    }
    setParams(next)
  }
  const changeQuery = ({ page: nextPage, unreadOnly: nextUnread }) => {
    if (!advanced) {
      setParams({ ...(nextPage > 1 ? { page: String(nextPage) } : {}), ...(nextUnread ? { unread: 'true' } : {}) }); return
    }
    updateFilters({ page: nextPage > 1 ? nextPage : '', unread: nextUnread ? 'true' : '' })
  }

  useEffect(() => {
    document.title = `${t('customer.profile.allNotifications')} | WashGo`
  }, [t])
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`space-y-4 lg:sticky ${stickyClassName}`}>
        <nav
          aria-label={t('customer.notification.filter')}
          className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <h2 className="-mx-4 -mt-4 mb-3 border-b border-border bg-primary/5 px-7 py-5 text-base font-bold">
            {t('customer.notification.title')}
          </h2>
          <div className="flex gap-2 lg:flex-col">
            {[false, true].map((value) => {
              const Icon = value ? Mail : List
              const selected = unreadOnly === value && (!advanced || value || !params.get('group'))
              return (
                <Button
                  key={String(value)}
                  variant="ghost"
                  className={`h-11 flex-1 justify-start rounded-xl border-l-[3px] px-3 text-base font-semibold lg:flex-none ${selected ? 'border-l-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary' : 'border-l-transparent text-muted-foreground'}`}
                  aria-pressed={selected}
                  aria-label={t(value ? 'customer.notification.unread' : 'customer.notification.all')}
                  onClick={() => advanced && !value ? updateFilters({ unread: '', group: '', type: '' }) : changeQuery({ page: 1, unreadOnly: value })}
                >
                  <Icon size={17} />
                  {t(value ? 'customer.notification.unread' : 'customer.notification.all')}
                  {!value && advanced && (
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {total ?? '—'}
                    </span>
                  )}
                  {value && unread !== null && (
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {unread}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
          {advanced && (
            <div className="mt-3 grid gap-2 border-t border-border pt-3">
              {categories.map(({ id: group, label }) => {
                const Icon = categoryIcons[group] || Inbox
                return (
                  <Button
                    key={group}
                    variant="ghost"
                    aria-label={t(label)}
                    aria-pressed={params.get('group') === group}
                    onClick={() => updateFilters({ group: params.get('group') === group ? '' : group, type: '' })}
                    className={`h-auto min-h-11 w-full min-w-0 justify-between rounded-xl border-l-[3px] px-3 py-2 text-base font-semibold ${params.get('group') === group ? 'border-l-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary' : 'border-l-transparent text-muted-foreground'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2 whitespace-normal text-left leading-snug">
                      <Icon
                        size={17}
                        className="shrink-0"
                      />
                      {t(label)}
                    </span>
                    <span className="ml-2 min-w-6 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                      {categoryCounts.data?.find(item => item.id === group)?.total ?? '—'}
                    </span>
                  </Button>
                )
              })}
              {categoryCounts.data?.some(item => item.total == null) && (
                <Button
                  variant="ghost"
                  className="h-auto whitespace-normal text-xs"
                  onClick={categoryCounts.retry}
                  disabled={categoryCounts.loading}
                >
                  {t('notificationNav.reloadCounts')}
                </Button>
              )}
            </div>
          )}
        </nav>
        <div className="hidden rounded-2xl border border-primary/15 bg-primary/5 p-5 lg:block">
          <Inbox
            className="mb-3 text-primary"
            size={24}
          />
          <p className="text-sm leading-6 text-muted-foreground">
            {t(descriptionKey)}
          </p>
        </div>
      </aside>
      <div className="min-w-0 space-y-5">
        {advanced && (
          <NotificationFilters
            loadSuggestions={loadSuggestions || suggestions}
            params={params}
            change={updateFilters}
            types={activeTypes}
            className={filterClassName}
          />
        )}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <NotificationInbox
            showResultCount={showResultCount}
            page={page}
            unreadOnly={unreadOnly}
            onChange={changeQuery}
            filters={filters}
            onCounts={advanced ? setCounts : undefined}
          />
        </div>
      </div>
    </div>
  )
}
