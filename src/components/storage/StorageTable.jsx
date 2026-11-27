import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Eye, RefreshCw } from 'lucide-react'
import { storageApi } from '~/apis/storage/storageApi'
import { ADMIN_ROUTES, MERCHANT_ROUTES } from '~/utils/config/constants'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Button } from '~/components/ui/button'
import StorageDetailsDialog from './StorageDetailsDialog'
import StorageCycleActions from './StorageCycleActions'

export default function StorageTable({ rows, role, onAction }) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState(null)
  const routes = role === 'Admin' ? ADMIN_ROUTES : MERCHANT_ROUTES
  const selectAction = (name, row) => {
    setDetail(null)
    onAction(name, row)
  }
  return (
    <>
      <div
        data-pagination-header
        className="min-w-0"
      >
        <Table
          aria-label={t('storage.title')}
          className="min-w-[1200px]"
        >
          <TableHeader>
            <TableRow>
              {['customer.incidents.relatedOrder', 'storage.storageReference', 'storage.currentLocationLabel', 'storage.state', 'storage.intakeAt', 'storage.feeTotal', 'storage.feePaid', 'storage.outstanding', 'customer.incidents.actions'].map(label => (
                <TableHead
                  key={label}
                  className={`bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] ${label === 'customer.incidents.actions' ? 'sticky right-0 z-20 min-w-28 border-l border-border text-center' : ['storage.feeTotal', 'storage.feePaid', 'storage.outstanding'].includes(label) ? 'text-right' : ''}`}
                >
                  {t(label)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
              const pending = storageApi.hasPending(row.orderId)
              return (
                <TableRow key={row.id || row.orderId}>
                  <TableCell>
                    <Link
                      className="whitespace-nowrap font-bold text-primary hover:underline"
                      to={`${routes.ORDERS}/${row.orderId}`}
                    >
                      {row.orderCode}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-44 break-words font-medium">
                    {row.storageReference || '—'}
                  </TableCell>
                  <TableCell className="max-w-60">
                    <p className="font-medium">
                      {t(`storage.locations.${row.currentLocation || 'Unknown'}`, { defaultValue: t('storage.locations.Unknown') })}
                    </p>
                    {row.merchantName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.merchantName}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${row.state === 5 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : [3, 4].includes(row.state) ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' : row.state === 6 ? 'bg-muted text-muted-foreground' : 'bg-teal-500/10 text-teal-700 dark:text-teal-300'}`}>
                      {t(`storage.states.${row.state}`)}
                    </span>
                    {row.isLate && (
                      <p className="mt-2 text-xs font-semibold text-destructive">
                        {t('storage.overdue')}
                      </p>
                    )}
                    {row.returnState && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t(`storage.returnStates.${row.returnState}`)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-44 text-xs leading-5">
                    {row.intakeAt ? formatDateTime(row.intakeAt) : '—'}
                  </TableCell>
                  {['feeTotal', 'feePaid', 'outstanding'].map(key => (
                    <TableCell
                      key={key}
                      className={`whitespace-nowrap text-right font-semibold tabular-nums ${key === 'outstanding' && row[key] > 0 ? 'text-amber-700 dark:text-amber-300' : key === 'feePaid' ? 'text-emerald-700 dark:text-emerald-300' : ''}`}
                    >
                      {formatCurrency(row[key])}
                    </TableCell>
                  ))}
                  <TableCell className="sticky right-0 z-10 w-28 min-w-28 border-l border-border bg-card text-center shadow-[-1px_0_0_var(--border)] dark:bg-card">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={(
                        <Button
                          size="icon"
                          variant="secondary"
                          aria-label={t('storageList.actions', { code: row.orderCode })}
                        />
                      )}
                      >
                        <MoreHorizontal size={20} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setDetail(row)}>
                          <Eye
                            size={17}
                            className="text-primary"
                          />
                          {t('customer.orders.details')}
                        </DropdownMenuItem>
                        <StorageCycleActions
                          row={row}
                          role={role}
                          disabled={pending}
                          menu
                          onAction={name => selectAction(name, row)}
                        />
                        {pending && (
                          <DropdownMenuItem onClick={() => selectAction('exception', row)}>
                            <RefreshCw size={17} />
                            {t('admin.sync.checkResult')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {detail && (
        <StorageDetailsDialog
          row={detail}
          role={role}
          onClose={() => setDetail(null)}
          onAction={name => selectAction(name, detail)}
        />
      )}
    </>
  )
}
