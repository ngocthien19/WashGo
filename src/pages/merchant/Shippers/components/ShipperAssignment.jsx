import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardPlus, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import TablePagination from '~/components/Pagination/TablePagination'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderApi } from '~/apis/merchant/merchantOrderApi'
import OrderActionDialog from '../../Orders/components/OrderActionDialog'
import { assignmentTask } from '../../Orders/orderModel'

function AssignmentConfirmation({ id, onClose }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => merchantOrderApi.detail(id, signal), [id])
  const resource = useCatalogResource(load)
  if (resource.data && assignmentTask(resource.data)) {
    return (
      <OrderActionDialog
        action="assign"
        order={resource.data}
        onClose={onClose}
        onSaved={onClose}
      />
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent closeLabel="common.close">
        <DialogTitle>
          {t('merchant.shippers.assign')}
        </DialogTitle>
        <DialogDescription>
          {t('merchant.shippers.assign')}
        </DialogDescription>
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
          empty="merchant.shippers.orderChanged"
        />
      </DialogContent>
    </Dialog>
  )
}
export default function ShipperAssignment({ onClose }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ keyword: '', status: 2, page: 1 })
  const [id, setId] = useState(null)
  const load = useCallback((signal) => merchantOrderApi.list({ ...query, take: 6, paymentStatus: query.status === 9 ? 2 : undefined, sortBy: [{ field: 'CreatedOn', isDescending: true }] }, signal), [query])
  const resource = useCatalogResource(load)
  if (id) {
    return (
      <AssignmentConfirmation
        id={id}
        onClose={onClose}
      />
    )
  }
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
        className="max-w-2xl border-primary/15"
      >
        <DialogTitle className="-mx-6 -mt-6 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-6 py-5 pr-12 text-2xl font-bold sm:-mx-8 sm:-mt-8 sm:px-8">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardPlus size={23} />
          </span>
          {t('merchant.shippers.assign')}
        </DialogTitle>
        <DialogDescription className="mt-2 text-base">
          {t('merchant.shippers.assignmentHint')}
        </DialogDescription>
        <div className="workspace-filters mt-5 grid items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-[2fr_1fr]">
          <CatalogToolbar
            embedded
            keyword={query.keyword}
            label={t('merchant.orders.search')}
            placeholder={t('merchant.orders.searchHint')}
            onSearch={(keyword) => setQuery({ ...query, keyword, page: 1 })}
          />
          <SelectField
            label={t('merchant.shippers.taskType')}
            value={query.status}
            onValueChange={(status) => setQuery({ ...query, status, page: 1 })}
            options={[2, 9, 99].map((value) => ({ value, label: t(`merchant.shippers.tasks.${value}`) }))}
          />
        </div>
        {resource.loading || resource.error || !resource.data?.list.length ? (
          <ResourceFeedback
            {...resource}
            loadingText="merchant.loading"
            empty="merchant.shippers.noAssignableOrders"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {resource.data.list.map((order) => (
              <Button
                key={order.id}
                variant="outline"
                className="h-auto w-full justify-between gap-4 rounded-2xl border-border p-4 text-left text-base hover:border-primary/40 hover:bg-primary/5"
                onClick={() => setId(order.id)}
              >
                <span>
                  <strong className="block text-primary">
                    {order.orderCode}
                  </strong>
                  <span className="mt-1 block font-normal text-muted-foreground">
                    {order.lockerName || '—'}
                  </span>
                </span>
                <ArrowRight
                  className="shrink-0"
                  size={18}
                />
              </Button>
            ))}
            <TablePagination
              currentPage={query.page}
              totalPages={resource.data.totalPages}
              onPageChange={(page) => setQuery({ ...query, page })}
              className="border-0 p-0"
              total={resource.data.total}
              pageSize={6}
              rowCount={resource.data.list.length}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
