import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, List, Mail, Inbox } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useNotifications } from '~/components/customer/notifications/NotificationContext'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import NotificationInbox from '~/components/customer/notifications/NotificationInbox'
import { CUSTOMER_ROUTES } from '~/utils/constants'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const unreadOnly = params.get('unread') === 'true'
  const { unread } = useNotifications()
  const changeQuery = ({ page, unreadOnly }) => setParams({ ...(page > 1 ? { page: String(page) } : {}), ...(unreadOnly ? { unread: 'true' } : {}) })
  useEffect(() => {
    document.title = `${t('customer.profile.allNotifications')} | WashGo`
  }, [t])
  return (
    <div className="min-h-[70dvh] bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.profile.allNotifications') }]} />
        <SectionHeading
          as="h1"
          icon={Bell}
          title={t('customer.profile.allNotifications')}
          description={t('customer.notification.description')}
        />
        <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-[var(--customer-header-offset)]">
            <nav
              aria-label={t('customer.notification.filter')}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <h2 className="mb-3 border-b border-border px-3 pb-4 pt-1 text-base font-bold">
                {t('customer.notification.title')}
              </h2>
              <div className="flex gap-2 lg:flex-col">
                {[false, true].map((value) => {
                  const Icon = value ? Mail : List
                  return (
                    <Button
                      key={String(value)}
                      variant="ghost"
                      className={`h-11 flex-1 justify-start rounded-xl border-l-[3px] px-3 text-sm lg:flex-none ${unreadOnly === value ? 'border-l-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary' : 'border-l-transparent text-muted-foreground'}`}
                      aria-pressed={unreadOnly === value}
                      aria-label={t(value ? 'customer.notification.unread' : 'customer.notification.all')}
                      onClick={() => changeQuery({ page: 1, unreadOnly: value })}
                    >
                      <Icon size={17} />
                      {t(value ? 'customer.notification.unread' : 'customer.notification.all')}
                      {value && unread !== null && (
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {unread}
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>
            </nav>
            <div className="hidden rounded-2xl border border-primary/15 bg-primary/5 p-5 lg:block">
              <Inbox
                className="mb-3 text-primary"
                size={24}
              />
              <p className="text-sm leading-6 text-muted-foreground">
                {t('customer.notification.description')}
              </p>
            </div>
          </aside>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <NotificationInbox
              page={page}
              unreadOnly={unreadOnly}
              onChange={changeQuery}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
