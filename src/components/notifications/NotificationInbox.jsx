import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import NotificationContent from './NotificationContent'
import { CheckCheck, Check, Trash2, ArrowUpRight, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import NotificationIcon from './NotificationIcon'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import useCatalogResource from '~/hooks/useCatalogResource'
import { notificationApi } from '~/apis/notifications/notificationApi'
import { formatDateTime } from '~/utils/format/formats'
import { notify } from '~/utils/notifications/notifications'
import { getApiError } from '~/utils/http/apiError'
import { cn } from '~/lib/utils'
import { useNotifications } from './NotificationContext'
import { notificationHref, notificationText } from './notificationModel'

export default function NotificationInbox({ onNavigate, page = 1, unreadOnly = false, onChange, compact = false, filters, onCounts, showResultCount = false }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const { revision, refresh, resolveHref = notificationHref } = useNotifications()
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const load = useCallback((signal) => filters ? notificationApi.filter({ ...filters, page, unreadOnly }, signal) : notificationApi.list(page, unreadOnly, signal), [page, unreadOnly, filters])
  const resource = useCatalogResource(load, revision, true)
  const { data, loading, error, retry } = resource
  useEffect(() => {
    if (data?.counts && onCounts) {
      onCounts(data.counts)
    }
  }, [data, onCounts])
  const mutate = async (action, next, onFailure) => {
    if (lock.current) {
      return
    }
    lock.current = true
    setPending(true)
    try {
      await action()
      if (mounted.current) {
        refresh()
        next?.()
      }
    } catch (error) {
      if (mounted.current) {
        notify.error(getApiError(error))
        refresh()
        onFailure?.()
      }
    } finally {
      lock.current = false
      if (mounted.current) {
        setPending(false)
      }
    }
  }
  const open = (item) => {
    const href = resolveHref(item)
    const go = () => {
      if (href) {
        onNavigate?.(); navigate(href)
      }
    }
    if (item.isRead) {
      go()
    } else {
      mutate(() => notificationApi.read(item.id), go, go)
    }
  }
  return (
    <motion.div
      data-pagination-scope
      initial={reduceMotion ? false : { y: 6 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      aria-busy={loading}
    >
      {!compact && (
        <div className="space-y-4 border-b border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {t(unreadOnly ? 'customer.notification.unread' : 'customer.profile.allNotifications')}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t('customer.orders.refresh')}
                disabled={loading || pending}
                onClick={() => {
                  retry(); refresh()
                }}
              >
                <RefreshCw size={18} />
              </Button>
              <Button
                variant="secondary"
                className="h-10 rounded-xl px-3 text-emerald-700 dark:text-emerald-300"
                disabled={pending}
                onClick={() => mutate(notificationApi.readAll, () => onChange({ page: 1, unreadOnly }))}
              >
                <CheckCheck size={17} />
                {t('customer.notification.readAll')}
              </Button>
              <Button
                variant="destructive"
                className="h-10 rounded-xl px-3"
                disabled={pending || !data?.total}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                {t('customer.notification.deleteAll')}
              </Button>
            </div>
          </div>
          {showResultCount && !loading && !error && data && (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              {t('searchSuggestions.notificationsFound', { count: data.total })}
            </p>
          )}
        </div>
      )}
      {(loading && !data) || error || !data?.list.length ? (
        <CatalogFeedback
          {...resource}
          loadingText="customer.notification.loading"
          empty="customer.notification.empty"
        />
      ) : (
        <ul className="divide-y divide-border">
          {data.list.map((item) => (
            <li
              key={item.id}
              className={cn('flex gap-3 p-4 sm:gap-4 sm:p-5', !compact && 'border-l-[3px]', item.isRead ? 'border-l-transparent bg-card' : 'border-l-primary bg-primary/5')}
            >
              <NotificationIcon
                type={item.type}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <h2 className="break-words text-base font-bold">
                      {notificationText(item, t).title}
                    </h2>
                    {!item.isRead && (
                      <span
                        className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                        aria-label={t('customer.notification.unread')}
                      />
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDateTime(item.createdOn)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  <NotificationContent item={item} />
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {resolveHref(item) && (
                    <Button
                      variant="link"
                      className="h-9 px-0"
                      disabled={pending}
                      onClick={() => open(item)}
                    >
                      {t('customer.notification.viewDetails')}
                      <ArrowUpRight size={16} />
                    </Button>
                  )}
                  {!item.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                      disabled={pending}
                      aria-label={t('customer.notification.markRead')}
                      onClick={() => mutate(() => notificationApi.read(item.id), () => {
                        if (unreadOnly && page > 1 && data.list.length === 1) {
                          onChange({ page: page - 1, unreadOnly })
                        }
                      })}
                    >
                      <Check size={17} />
                    </Button>
                  )}
                  {item.isRead && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCheck size={14} />
                      {t('customer.notification.read')}
                    </span>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-auto size-9"
                    disabled={pending}
                    aria-label={t('customer.notification.delete')}
                    onClick={() => mutate(() => notificationApi.remove(item.id), () => {
                      if (data.list.length === 1 && page > 1) {
                        onChange({ page: page - 1, unreadOnly })
                      }
                    })}
                  >
                    <Trash2 size={17} />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!compact && !loading && !error && data?.totalPages > 1 && (
        <Pagination
          className="border-t border-border bg-muted/30 p-4"
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          disabled={pending}
          onPageChange={(next) => onChange({ page: next, unreadOnly })}
        />
      )}
      <Dialog
        open={confirmDelete}
        onOpenChange={open => {
          if (!lock.current) {
            setConfirmDelete(open)
          }
        }}
      >
        <DialogContent closeLabel="common.close">
          <DialogHeader tone="danger">
            <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-semibold">
              <Trash2 />
              {t('customer.notification.deleteAll')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
              {t('customer.notification.deleteAllDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              className="h-11 px-4"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
            >
              {t('common.close')}
            </Button>
            <Button
              variant="destructive"
              className="h-11 px-4"
              disabled={pending}
              onClick={() => mutate(notificationApi.removeAll, () => {
                setConfirmDelete(false); onChange({ page: 1, unreadOnly })
              })}
            >
              {t('customer.notification.deleteAll')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
