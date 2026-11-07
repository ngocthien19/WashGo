import { IncidentActions, IncidentMessages } from './components/IncidentSelfService'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import { useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageSquareWarning, RefreshCw, Package, Images, ClipboardCheck, Wallet, CalendarDays, ArrowLeft, ShieldAlert } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import { Button } from '~/components/ui/button'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerIncidentApi } from '~/apis/customer/customerIncidentApi'
import { CUSTOMER_ROUTES, TEXT_LINK_STYLES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import IncidentStatusBadge from './components/IncidentStatusBadge'

export default function ComplaintDetailPage() {
  const { t } = useTranslation()
  const { incidentId } = useParams()
  const load = useCallback((signal) => customerIncidentApi.get(incidentId, signal), [incidentId])
  const resource = useCatalogResource(load)
  const incident = resource.data
  useEffect(() => {
    document.title = `${t('customer.incidents.detailTitle')}${incident ? ` - ${incident.orderCode}` : ''} | WashGo`
  }, [incident, t])
  return (
    <div className="min-h-[70dvh] bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.incidents.title'), to: CUSTOMER_ROUTES.COMPLAINTS }, { label: incident?.orderCode || t('customer.incidents.detailTitle') }]} />
        {resource.loading || resource.error || !incident ? (
          <CatalogFeedback
            {...resource}
            loadingText="customer.incidents.loading"
          />
        ) : (
          <>
            <div className="grid gap-5">
              <SectionHeading
                as="h1"
                icon={MessageSquareWarning}
                title={t('customer.incidents.detailTitle')}
                description={incident.orderCode}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-emerald-200 bg-emerald-50 px-4 text-emerald-800 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-white"
                    render={<Link to={CUSTOMER_ROUTES.COMPLAINTS} />}
                    nativeButton={false}
                  >
                    <ArrowLeft size={16} />
                    {t('customer.incidents.back')}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl px-4"
                    onClick={resource.retry}
                  >
                    <RefreshCw size={16} />
                    {t('customer.orders.refresh')}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <IncidentActions
                    key={incident.id}
                    incident={incident}
                    onSaved={resource.retry}
                  />
                </div>
              </div>
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-6">

                <section
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-linear-to-r from-rose-500/8 to-card p-5 sm:p-6">
                    <h2 className="flex items-center gap-3 text-lg font-semibold">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                        <ShieldAlert size={23} />
                      </span>
                      {t(`customer.incidents.types.${incident.type}`, { defaultValue: t('customer.orders.unknown') })}
                    </h2>
                    <IncidentStatusBadge status={incident.status} />
                  </div>
                  <div className="space-y-5 p-5 sm:p-6">
                    <dl className="grid gap-4 rounded-xl bg-muted/30 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">
                          {t('customer.incidents.severity')}
                        </dt>
                        <dd className="mt-1 font-bold">
                          {t(`customer.incidents.severities.${incident.severity}`, { defaultValue: t('customer.orders.unknown') })}
                        </dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarDays size={14} />
                          {t('customer.incidents.createdAt')}
                        </dt>
                        <dd className="mt-1 font-bold">
                          {formatDateTime(incident.createdOn)}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                      <Package className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t('customer.incidents.relatedOrder')}
                        </p>
                        <Link
                          className={`${TEXT_LINK_STYLES} font-bold`}
                          to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', incident.orderId)}
                        >
                          {incident.orderCode}
                        </Link>
                        {incident.merchantName && (
                          <p className="break-words text-xs text-muted-foreground">
                            {incident.merchantName}
                          </p>
                        )}
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold">
                      {t('customer.incidents.descriptionLabel')}
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7">
                      {incident.description}
                    </p>
                    {!!incident.videoUrls?.length && <CustomerVideoGallery urls={incident.videoUrls} />}
                    {!!incident.imageUrls?.length && (
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <Images className="size-4 text-violet-500" />
                          {t('customer.incidents.evidence')}
                        </h3>
                        <CustomerImageGallery urls={incident.imageUrls} />
                      </div>
                    )}
                  </div>
                </section>

              </div>
              <div className="min-w-0 space-y-6">
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <h2 className="flex items-center gap-2 border-b border-border bg-emerald-500/5 p-5 text-lg font-semibold">
                    <Wallet className="size-5 text-emerald-600 dark:text-emerald-300" />
                    {t('customer.incidents.compensation')}
                  </h2>
                  <div className="space-y-4 p-5 text-sm">
                    <p className="text-muted-foreground">
                      {t(`customer.incidents.compensationStatus.${incident.compensationStatus ?? 0}`, { defaultValue: t('customer.orders.unknown') })}
                    </p>
                    {incident.compensationAmount > 0 && (
                      <div className="space-y-3">
                        <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(incident.compensationAmount)}
                        </p>
                        <p>
                          {t('customer.incidents.itemValue')}
                          :
                          {' '}
                          <strong>
                            {formatCurrency(incident.itemValue)}
                          </strong>
                        </p>
                        {incident.compensationPaidAt && (
                          <p>
                            {t('customer.incidents.paidAt')}
                            :
                            {' '}
                            <strong>
                              {formatDateTime(incident.compensationPaidAt)}
                            </strong>
                          </p>
                        )}
                        {incident.compensationReference && (
                          <p className="break-words">
                            {t('customer.incidents.reference')}
                            :
                            {' '}
                            <strong>
                              {incident.compensationReference}
                            </strong>
                          </p>
                        )}
                      </div>
                    )}
                    <p className="border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                      {t('customer.incidents.compensationHint')}
                    </p>
                  </div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <h2 className="flex items-center gap-2 border-b border-border bg-primary/5 p-5 text-lg font-semibold sm:px-6">
                    <ClipboardCheck className="size-5 text-primary" />
                    {t('customer.incidents.resolution')}
                  </h2>
                  <div className="space-y-4 p-5 sm:p-6">
                    <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/30 p-4 text-sm leading-7">
                      {incident.resolutionNote || t(incident.status === 1 ? 'customer.incidents.awaitingReview' : 'customer.incidents.noResolution')}
                    </p>
                    {incident.reviewedAt && (
                      <p className="text-xs text-muted-foreground">
                        {t('customer.incidents.reviewedAt')}
                        :
                        {' '}
                        <strong>
                          {formatDateTime(incident.reviewedAt)}
                        </strong>
                      </p>
                    )}
                    {incident.responsibleParty != null && (
                      <p className="text-sm">
                        {t('customer.incidents.responsibleParty')}
                        :
                        {' '}
                        <strong>
                          {t(`customer.incidents.parties.${incident.responsibleParty}`, { defaultValue: t('customer.orders.unknown') })}
                        </strong>
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
            <IncidentMessages
              key={incident.id}
              incident={incident}
            />
          </>
        )}
      </div>
    </div>
  )
}
