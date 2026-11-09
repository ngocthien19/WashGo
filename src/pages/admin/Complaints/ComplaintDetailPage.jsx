import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, MessageSquareWarning, CheckCheck, X, Wallet } from 'lucide-react'
import { Button, buttonVariants } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import IncidentStatusBadge from '~/pages/customer/Complaints/components/IncidentStatusBadge'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminComplaintApi } from '~/apis/admin/adminComplaintApi'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { ADMIN_ROUTES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { canAct, severityClass } from './complaintModel'
import ComplaintActionDialog from './components/ComplaintActionDialog'
import ComplaintMessages from './components/ComplaintMessages'
import ComplaintContact from './components/ComplaintContact'
import useComplaintContacts from './useComplaintContacts'
import { customerContact, merchantContact } from './complaintContacts'

export default function ComplaintDetailPage() {
  const { incidentId } = useParams(), { t } = useTranslation()
  const load = useCallback(signal => isId(incidentId) ? adminComplaintApi.detail(incidentId, signal) : Promise.reject(new Error('admin.invalidResponse')), [incidentId])
  const resource = useCatalogResource(load), value = resource.data
  const contacts = useComplaintContacts(value)
  const contactData = contacts.data || { customer: customerContact(value || {}), merchant: merchantContact(value || {}) }
  const [action, setAction] = useState(null)
  useEffect(() => {
    document.title = `${t('admin.complaints.detail')} | WashGo`
  }, [t])
  return (
    <Reveal className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <MessageSquareWarning className="text-primary" />
            {t('admin.complaints.detail')}
          </h1>
          {value && (
            <p className="mt-3 inline-flex rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary">
              {value.orderCode}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={ADMIN_ROUTES.COMPLAINTS}
            className={buttonVariants({ variant: 'outline', className: 'h-11 px-5 text-base' })}
          >
            <ArrowLeft size={18} />
            {t('customer.incidents.back')}
          </Link>
          <Button
            variant="outline"
            onClick={resource.retry}
            disabled={resource.loading}
            className="h-11 px-5 text-base"
          >
            <RefreshCw size={18} />
            {t('customer.orders.refresh')}
          </Button>
        </div>
      </header>
      {!value ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <IncidentStatusBadge status={value.status} />
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${severityClass(value.severity)}`}>
                {t(`customer.incidents.severities.${value.severity}`)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {canAct(value, 'resolve') && (
                <>
                  <Button
                    onClick={() => setAction('resolve')}
                    className="h-11 bg-emerald-600 px-5 text-base text-white hover:bg-emerald-700"
                  >
                    <CheckCheck size={18} />
                    {t('admin.complaints.resolve')}
                  </Button>
                  <Button
                    onClick={() => setAction('reject')}
                    variant="destructive"
                    className="h-11 px-5 text-base hover:bg-red-600 hover:text-white"
                  >
                    <X size={18} />
                    {t('admin.complaints.reject')}
                  </Button>
                </>
              )}
              {canAct(value, 'pay') && (
                <Button
                  onClick={() => setAction('pay')}
                  className="h-11 bg-emerald-600 px-5 text-base text-white hover:bg-emerald-700"
                >
                  <Wallet size={18} />
                  {t('admin.complaints.pay')}
                </Button>
              )}
            </div>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="-mx-5 -mt-5 rounded-t-2xl border-b border-primary/10 bg-primary/5 px-5 py-4 text-lg font-semibold">
                  {t('admin.complaints.content')}
                </h2>
                <dl className="grid gap-5 sm:grid-cols-2">
                  {[['type', t(`customer.incidents.types.${value.type}`)], ['createdAt', formatDateTime(value.createdOn)]].map(([key, text]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`customer.incidents.${key}`)}
                      </dt>
                      <dd className="mt-2 font-semibold">
                        {text}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                  {value.description}
                </p>
                {value.customerUpdatedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t('admin.complaints.customerUpdated', { date: formatDateTime(value.customerUpdatedAt) })}
                  </p>
                )}
              </section>
              <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="-mx-5 -mt-5 rounded-t-2xl border-b border-primary/10 bg-primary/5 px-5 py-4 text-lg font-semibold">
                  {t('admin.complaints.evidence')}
                </h2>
                <CustomerImageGallery urls={value.imageUrls || []} />
                <CustomerVideoGallery urls={value.videoUrls || []} />
                {!value.imageUrls?.length && !value.videoUrls?.length && (
                  <p className="text-sm text-muted-foreground">
                    {t('admin.complaints.noEvidence')}
                  </p>
                )}
              </section>
              <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="-mx-5 -mt-5 rounded-t-2xl border-b border-primary/10 bg-primary/5 px-5 py-4 text-lg font-semibold">
                  {t('customer.incidents.resolution')}
                </h2>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {value.status === 4 ? value.withdrawReason || t('customer.sync.withdrawn') : value.resolutionNote || t('customer.incidents.awaitingReview')}
                </p>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">
                      {t('customer.incidents.responsibleParty')}
                    </dt>
                    <dd className="mt-2 font-semibold">
                      {value.responsibleParty ? t(`customer.incidents.parties.${value.responsibleParty}`) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t(value.status === 4 ? 'admin.complaints.withdrawnAt' : 'customer.incidents.reviewedAt')}
                    </dt>
                    <dd className="mt-2 font-semibold">
                      {formatDateTime(value.status === 4 ? value.withdrawnAt : value.reviewedAt)}
                    </dd>
                  </div>
                </dl>
              </section>
              <ComplaintMessages
                key={`${value.id}:${value.customerUpdatedAt || ''}:${value.status}:${value.compensationStatus}`}
                incident={value}
                onChanged={resource.retry}
              />
            </div>
            <aside className="min-w-0 space-y-6">
              <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="-mx-5 -mt-5 rounded-t-2xl border-b border-primary/10 bg-primary/5 px-5 py-4 text-lg font-semibold">
                  {t('admin.complaints.participants')}
                </h2>
                <dl className="space-y-5">
                  {['customer', 'merchant'].map(key => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`admin.complaints.${key}`)}
                      </dt>
                      <dd className="mt-3">
                        <ComplaintContact
                          kind={key}
                          value={contactData[key]}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
                <Link
                  to={`${ADMIN_ROUTES.ORDERS}/${value.orderId}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                >
                  {t('customer.incidents.relatedOrder')}
                  {' '}
                  ·
                  {' '}
                  {value.orderCode}
                </Link>
              </section>
              <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="-mx-5 -mt-5 rounded-t-2xl border-b border-primary/10 bg-primary/5 px-5 py-4 text-lg font-semibold">
                  {t('customer.incidents.compensation')}
                </h2>
                <p className={`rounded-full px-3 py-2 text-sm font-medium ${value.compensationStatus === 1 ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : value.compensationStatus === 2 ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  {t(`customer.incidents.compensationStatus.${value.compensationStatus}`)}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(value.compensationAmount)}
                </p>
                <dl className="space-y-5">
                  {[['itemValue', formatCurrency(value.itemValue)], ['reference', value.compensationReference || '—'], ['paidAt', formatDateTime(value.compensationPaidAt)]].map(([key, text]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`customer.incidents.${key}`)}
                      </dt>
                      <dd className="mt-2 break-words font-semibold">
                        {text}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('admin.complaints.paymentHint')}
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
      {action && value && (
        <ComplaintActionDialog
          key={`${value.id}:${action}`}
          id={value.id}
          kind={action}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null); resource.retry()
          }}
        />
      )}
    </Reveal>
  )
}
