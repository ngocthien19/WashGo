import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/format/formats'
import logo from '~/assets/logo-washgo.svg'
import { receiptReference } from '~/utils/orders/receiptReference'

export default function OrderReceiptDocument({ order: receipt }) {
  const { t } = useTranslation()
  return (
    <article
      aria-label={t('customer.orders.receipt.title')}
      className="grid gap-6 overflow-hidden rounded-2xl border border-border bg-card text-foreground print:overflow-visible print:border-0 print:bg-white print:text-black print:[&_.text-muted-foreground]:text-slate-600 print:[&_.text-primary]:text-blue-700"
    >
      <header className="border-b border-primary/15 bg-primary/5 p-5 sm:p-7 print:bg-white">
        <div className="mb-5 flex items-center gap-3">
          <img
            src={logo}
            alt=""
            className="size-11"
          />
          <span className="text-2xl font-bold text-primary print:text-blue-600">WashGo</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {t('customer.orders.receipt.title')}
            </h2>
            <p className="mt-2 font-semibold">
              {receipt.receiptNumber}
            </p>
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-muted-foreground">
              {t('customer.sync.issuedAt', { date: formatDateTime(receipt.issuedAt) })}
            </p>
            <p className="font-semibold text-primary">
              {receipt.orderCode}
            </p>
          </div>
        </div>
      </header>
      <div className="grid gap-6 px-5 pb-5 sm:px-7 sm:pb-7">
        <div className="grid gap-4 sm:grid-cols-2">
          {['seller', 'buyer'].map((key) => (
            <section
              key={key}
              className="grid content-start gap-1 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm print:break-inside-avoid print:border-slate-200 print:bg-white"
            >
              <h3 className="font-bold">
                {t(`customer.sync.${key}`)}
              </h3>
              {['name', 'address', 'phone', 'email', 'taxCode'].map((field) => receipt[key]?.[field] && (
                <p
                  key={field}
                  className="break-words"
                >
                  {field === 'taxCode' ? `${t('customer.sync.taxCode')}: ` : ''}
                  {receipt[key][field]}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary/15 bg-primary/5 print:border-slate-200 print:bg-slate-50">
                {['service', 'quantity', 'amount'].map((key) => (
                  <th
                    key={key}
                    className={`p-3 ${key === 'amount' ? 'text-right' : ''}`}
                  >
                    {t(`customer.sync.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...receipt.lines, ...receipt.fees].map((line, index) => (
                <tr
                  key={index}
                  className="border-t border-border print:break-inside-avoid"
                >
                  <td className="p-3">
                    {line.description}
                  </td>
                  <td className="p-3">
                    {line.quantity}
                    {['item', 'pair', 'kg'].includes(line.unit) && ` ${t(line.unit === 'kg' ? 'actuals.package' : `actuals.units.${line.unit}`)}`}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="grid gap-3 rounded-xl bg-muted/25 p-4 text-sm print:break-inside-avoid print:bg-slate-50">
          {receipt.actualWeightKg != null && (
            <div className="flex justify-between gap-4">
              <dt>
                {t('actuals.weight')}
              </dt>
              <dd className="font-semibold">
                {formatNumber(receipt.actualWeightKg)}
                {' '}
                kg
              </dd>
            </div>
          )}
          {[['servicesAmount', 'customer.order.subtotal'], ['weightSurchargeAmount', 'customer.orders.weightSurcharge'], ['discountAmount', 'customer.order.discount'], ['totalPaid', 'customer.sync.totalPaid']].map(([key, label]) => (
            <div
              key={key}
              className={`flex justify-between gap-4 ${key === 'totalPaid' ? 'border-t border-primary/20 pt-3 text-lg font-bold text-primary' : ''}`}
            >
              <dt>
                {t(label)}
              </dt>
              <dd className="font-bold">
                {formatCurrency(receipt[key])}
              </dd>
            </div>
          ))}
          {Number.isSafeInteger(receipt.redeemedPoints) && receipt.redeemedPoints > 0 && (
            <div className="flex justify-between gap-4">
              <dt>
                {t('loyalty.redeemedPoints')}
              </dt>
              <dd className="font-bold">
                {formatNumber(receipt.redeemedPoints)}
              </dd>
            </div>
          )}
        </dl>
        <section className="grid gap-2 text-sm">
          <h3 className="font-bold">
            {t('customer.sync.payments')}
          </h3>
          {receipt.payments.map((payment, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 p-4 print:break-inside-avoid print:border-slate-200 print:bg-white"
            >
              <div className="space-y-1">
                {[1, 2, 3].includes(payment.method) && (
                  <p className="font-semibold">
                    {payment.method === 1 ? t('actuals.cash') : payment.method === 2 ? 'VNPay' : 'MoMo'}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {formatDateTime(payment.paidAt)}
                </p>
                {receiptReference(receipt.orderCode, payment) && (
                  <p className="break-all text-xs text-muted-foreground">
                    {receiptReference(receipt.orderCode, payment)}
                  </p>
                )}
              </div>
              <p className="font-semibold tabular-nums text-primary">
                {formatCurrency(payment.amount)}
              </p>
            </div>
          ))}
        </section>
      </div>
    </article>
  )
}
