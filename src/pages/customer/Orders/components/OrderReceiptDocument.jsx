import { useTranslation } from 'react-i18next'
import { CheckCircle2, ReceiptText } from 'lucide-react'
import Brand from '~/components/Brand/Brand'
import { CUSTOMER_ROUTES, PAYMENT_OPTIONS } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'

export default function OrderReceiptDocument({ order }) {
  const { t } = useTranslation()
  return (
    <article
      aria-label={t('customer.orders.receipt.title')}
      className="overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm print:overflow-visible print:rounded-none print:border-0 print:bg-white print:text-black print:shadow-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-5 border-b border-primary/10 bg-linear-to-br from-primary/10 via-primary/5 to-card p-6 sm:p-8 print:bg-none print:p-0 print:pb-6">
        <Brand to={CUSTOMER_ROUTES.HOME} />
        <div className="space-y-2 sm:text-right">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ReceiptText className="size-5 text-primary print:hidden" />
            {t('customer.orders.receipt.title')}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 print:text-emerald-800">
            <CheckCircle2 size={14} />
            {t('customer.orders.paymentStatus.2')}
          </span>
        </div>
      </div>
      <div className="space-y-6 p-5 sm:p-8 print:p-0 print:pt-6">
        <dl className="grid gap-5 rounded-xl border border-border bg-muted/25 p-4 text-sm sm:grid-cols-2 print:border-0 print:bg-transparent print:p-0">
          {[
            ['customer.orders.receipt.order', order.orderCode],
            ['customer.orders.receipt.customer', order.customerName],
            ['customer.orders.receipt.paidAt', formatDateTime(order.paidAt)],
            ['customer.payment.method', t(PAYMENT_OPTIONS.find((option) => option.value === order.paymentMethod)?.label || 'customer.orders.unknown')]
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground print:text-slate-600">
                {t(label)}
              </dt>
              <dd className="mt-1 break-words font-bold">
                {value || '—'}
              </dd>
            </div>
          ))}
        </dl>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/35 print:bg-transparent">
                <th className="rounded-tl-lg px-3 py-3 font-semibold">
                  {t('customer.orders.receipt.service')}
                </th>
                <th className="px-3 py-3 text-right font-semibold">
                  {t('customer.orders.receipt.quantity')}
                </th>
                <th className="rounded-tr-lg px-3 py-3 text-right font-semibold">
                  {t('customer.orders.receipt.amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr
                  key={item.id || item.serviceId}
                  className="border-b border-border/60 align-top"
                >
                  <td className="min-w-24 break-words px-3 py-4 font-medium">
                    {item.serviceName}
                  </td>
                  <td className="px-3 py-4 text-right font-bold tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right font-bold tabular-nums">
                    {formatCurrency(item.subTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto max-w-sm space-y-3 rounded-xl bg-muted/30 p-4 text-sm print:bg-transparent print:p-0">
          {[
            ['customer.order.subtotal', order.totalAmount],
            ['customer.orders.weightSurcharge', order.weightSurchargeAmount],
            ['customer.order.discount', order.discountAmount]
          ].map(([label, amount]) => (
            <div
              key={label}
              className="flex justify-between gap-5"
            >
              <dt className="text-muted-foreground print:text-slate-600">
                {t(label)}
              </dt>
              <dd className="font-bold tabular-nums">
                {formatCurrency(amount)}
              </dd>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <dt className="font-semibold">
              {t('customer.orders.total')}
            </dt>
            <dd className="text-2xl font-bold tabular-nums text-primary print:text-black">
              {formatCurrency(order.finalAmount)}
            </dd>
          </div>
        </dl>
        <p className="border-t border-border pt-5 text-xs leading-6 text-muted-foreground print:text-slate-600">
          {t('customer.orders.receipt.note')}
        </p>
      </div>
    </article>
  )
}
