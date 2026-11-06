import { useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageSquareWarning, Eye, RefreshCw, Plus } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import CatalogResultSummary from '~/components/customer/catalog/CatalogResultSummary'
import Pagination from '~/components/Pagination/Pagination'
import Reveal from '~/components/motion/Reveal'
import { Button } from '~/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import CustomerImageStack from '~/components/customer/CustomerImageStack'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { customerIncidentApi } from '~/apis/customer/customerIncidentApi'
import { CUSTOMER_ROUTES, INCIDENT_CONFIG, TEXT_LINK_STYLES } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import IncidentStatusBadge from './components/IncidentStatusBadge'
import { readIncidentPage } from './incidentModel'

export default function ComplaintsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const page = readIncidentPage(params)
  const load = useCallback((signal) => customerIncidentApi.list(page, signal), [page])
  const resource = useCatalogResource(load)
  const { data, loading, error, retry } = resource
  useEffect(() => {
    document.title = `${t('customer.incidents.title')} | WashGo`
  }, [t])
  const first = data?.list.length ? (data.currentPage - 1) * (data.pageSize || INCIDENT_CONFIG.PAGE_SIZE) + 1 : 0
  return (
    <div className="min-h-[70dvh] bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.incidents.title') }]} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading
            as="h1"
            icon={MessageSquareWarning}
            title={t('customer.incidents.title')}
            description={t('customer.incidents.listDescription')}
          />
          <Button
            variant="outline-violet"
            className="h-11 rounded-xl px-4"
            render={<Link to={CUSTOMER_ROUTES.ORDERS} />}
            nativeButton={false}
          >
            <Plus size={17} />
            {t('customer.incidents.reportFromOrder')}
          </Button>
        </div>
        <CatalogResultSummary
          icon={MessageSquareWarning}
          count={!loading && !error ? data?.total || 0 : undefined}
          title={t(loading ? 'customer.incidents.loading' : error ? 'customer.incidents.title' : 'customer.incidents.foundLabel', { count: data?.total || 0 })}
          range={!loading && !error && data?.list.length ? t('customer.showing', { firstResult: first, lastResult: first + data.list.length - 1, total: data.total }) : undefined}
          actions={(
            <Button
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={retry}
              disabled={loading}
            >
              <RefreshCw size={16} />
              {t('customer.orders.refresh')}
            </Button>
          )}
        />
        {loading || error || !data?.list.length ? (
          <CatalogFeedback
            {...resource}
            loadingText="customer.incidents.loading"
            empty="customer.incidents.empty"
          />
        ) : (
          <Reveal className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table
              aria-label={t('customer.incidents.title')}
              className="min-w-[1080px]"
            >
              <TableHeader>
                <TableRow>
                  {['customer.incidents.relatedOrder', 'customer.incidents.type', 'customer.incidents.severity', 'customer.incidents.statusLabel', 'customer.incidents.evidence', 'customer.incidents.compensation', 'customer.incidents.actions'].map((label) => (
                    <TableHead key={label}>
                      {t(label)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.list.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        className={`${TEXT_LINK_STYLES} font-bold`}
                        to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', incident.orderId)}
                      >
                        {incident.orderCode}
                      </Link>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatDateTime(incident.createdOn)}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-56 max-w-72">
                      <p className="font-semibold">
                        {t(`customer.incidents.types.${incident.type}`, { defaultValue: t('customer.orders.unknown') })}
                      </p>
                      <p className="mt-1.5 line-clamp-2 break-words text-xs leading-6 text-muted-foreground">
                        {incident.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="whitespace-nowrap text-sm font-semibold">
                        {t(`customer.incidents.severities.${incident.severity}`, { defaultValue: t('customer.orders.unknown') })}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <IncidentStatusBadge status={incident.status} />
                    </TableCell>
                    <TableCell>
                      <CustomerImageStack urls={incident.imageUrls} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {incident.compensationAmount > 0 ? (
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(incident.compensationAmount)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t(`customer.incidents.compensationStatus.${incident.compensationStatus ?? 0}`)}
                          </p>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-10 rounded-xl"
                        aria-label={t('customer.orders.details')}
                        render={<Link to={CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', incident.id)} />}
                        nativeButton={false}
                      >
                        <Eye size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Reveal>
        )}
        {!loading && !error && data?.totalPages > 0 && (
          <Pagination
            currentPage={data.currentPage}
            totalPages={data.totalPages}
            onPageChange={(next) => setParams(next > 1 ? { page: String(next) } : {})}
          />
        )}
      </div>
    </div>
  )
}
