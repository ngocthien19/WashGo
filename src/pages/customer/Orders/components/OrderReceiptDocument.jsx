import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDateTime } from '~/utils/formats'

export default function OrderReceiptDocument({ order: receipt }) {
  const { t } = useTranslation()
  return (
    <article
      aria-label={t('customer.orders.receipt.title')}
      className="grid gap-5 rounded-2xl border border-border bg-card p-5 text-foreground print:border-0 print:bg-white print:text-black sm:p-7"
    >
      <header className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold">
          {t('customer.orders.receipt.title')}
        </h2>
        <p className="mt-2 font-semibold">
          {receipt.receiptNumber}
        </p>
        <p className="mt-1 text-sm">
          {t('customer.sync.issuedAt', { date: formatDateTime(receipt.issuedAt) })}
        </p>
        <p className="mt-1 text-sm">
          {receipt.orderCode}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {['seller', 'buyer'].map((key) => (
          <section
            key={key}
            className="grid content-start gap-1 rounded-xl bg-muted/25 p-4 text-sm"
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
            <tr>
              {['service', 'quantity', 'amount'].map((key) => (
                <th
                  key={key}
                  className="p-3"
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
                className="border-t border-border"
              >
                <td className="p-3">
                  {line.description}
                </td>
                <td className="p-3">
                  {line.quantity}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold">
                  {formatCurrency(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid gap-3 rounded-xl bg-muted/25 p-4 text-sm">
        {[['servicesAmount', 'customer.order.subtotal'], ['weightSurchargeAmount', 'customer.orders.weightSurcharge'], ['discountAmount', 'customer.order.discount'], ['totalPaid', 'customer.sync.totalPaid']].map(([key, label]) => (
          <div
            key={key}
            className="flex justify-between gap-4"
          >
            <dt>
              {t(label)}
            </dt>
            <dd className="font-bold">
              {formatCurrency(receipt[key])}
            </dd>
          </div>
        ))}
      </dl>
      <section className="grid gap-2 text-sm">
        <h3 className="font-bold">
          {t('customer.sync.payments')}
        </h3>
        {receipt.payments.map((payment, index) => (
          <p
            key={index}
            className="break-words"
          >
            {formatDateTime(payment.paidAt)}
            {' '}
            ·
            {' '}
            {formatCurrency(payment.amount)}
            {' '}
            ·
            {' '}
            {payment.reference}
          </p>
        ))}
      </section>
      <p className="text-sm leading-6 text-muted-foreground">
        {receipt.note || t('customer.orders.receipt.note')}
      </p>
    </article>
  )
}
