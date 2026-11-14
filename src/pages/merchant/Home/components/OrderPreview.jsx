import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '~/components/ui/button'
import { MERCHANT_ROUTES } from '~/utils/config/constants'
import { useTranslation } from 'react-i18next'
import { Package } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantDashboardApi } from '~/apis/merchant/merchantDashboardApi'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'
import OrderCommission from '~/components/merchant/OrderCommission'

export default function OrderPreview({ id, onClose }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => merchantDashboardApi.order(id, signal), [id])
  const resource = useCatalogResource(load)
  const order = resource.data
  useEffect(() => {
    document.title = `${order ? `${t('customer.order.orderDetails')} ${order.orderCode}` : t('merchant.overview')} | WashGo`
    return () => {
      document.title = `${t('merchant.overview')} | WashGo`
    }
  }, [order, t])
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="max-w-2xl"
      >
        <DialogTitle className="flex items-center gap-3 text-xl font-bold">
          <Package className="text-primary" />
          {order?.orderCode || t('customer.order.orderDetails')}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          {t('merchant.orderPreview')}
        </DialogDescription>
        {!order || resource.loading || resource.error ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
          />
        ) : (
          <div className="mt-6 space-y-5">
            <Button
              render={<Link to={`${MERCHANT_ROUTES.ORDERS}/${id}`} />}
              nativeButton={false}
              className="h-11 px-4 text-base"
            >
              {t('merchant.orders.manage')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(order.createdOn)}
            </p>
            <p className="font-semibold">
              {order.lockerName}
              {' '}
              ·
              {' '}
              {t('customer.order.box', { number: order.boxNumber })}
            </p>
            <div className="divide-y divide-border">
              {order.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex justify-between gap-4 py-3"
                >
                  <span className="break-words">
                    {item.serviceName}
                    {' '}
                    ×
                    {' '}
                    <strong>
                      {item.quantity}
                    </strong>
                  </span>
                  <strong className="shrink-0">
                    {formatCurrency(item.subTotal)}
                  </strong>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-border pt-4">
              <span>
                {t('customer.orders.total')}
              </span>
              <strong className="text-xl text-primary">
                {formatCurrency(order.finalAmount)}
              </strong>
            </div>
            <OrderCommission order={order} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
