import PromotionPicker from './PromotionPicker'
import { isWeightService } from '../orderModel'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import { catalogImages } from '~/apis/customer/customerCatalogApi'
import { useTranslation } from 'react-i18next'
import { Controller } from 'react-hook-form'
import PaymentMethodPicker from '~/components/customer/payments/PaymentMethodPicker'
import { Banknote, TicketPercent, PackageCheck, PanelsTopLeft, Info } from 'lucide-react'
import FormError from '~/components/ui/FormError'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { formatCurrency, formatLockerAddress } from '~/utils/formats'
import { LOCKER_SLOT_SIZES, ORDER_LIMITS, ORDER_PANEL_HEADER_STYLES } from '~/utils/constants'

export default function OrderConfirmation({ items, locker, box, form, quote, promotionCode, codeDirty, onApply, onClear, busy }) {
  const { t } = useTranslation()
  const { register, formState: { errors } } = form
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <h2 className={`${ORDER_PANEL_HEADER_STYLES} text-lg font-semibold`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <PackageCheck size={21} />
            </span>
            {t('customer.order.orderDetails')}
          </h2>
          <div className="p-5 sm:p-6">
            <ul className="space-y-3">
              {items.map(({ service, quantity }) => (
                <li
                  key={service.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                >
                  <ResourceThumbnail
                    urls={catalogImages(service)}
                    name={service.name}
                    className="size-14"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words font-medium">
                      {service.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(isWeightService(service) ? service.unitPrice : service.pricePerItem ?? service.unitPrice)}
                      {' / 1 '}
                      {isWeightService(service) ? t('customer.order.package') : service.unit}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-violet-500/8 px-3 py-1.5 text-sm tabular-nums text-violet-700 dark:text-violet-300">
                    ×
                    {' '}
                    {quantity}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/6 to-transparent p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <ResourceThumbnail
                  urls={catalogImages(locker)}
                  name={locker.name}
                  className="size-14"
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="break-words font-semibold">
                    {locker.name}
                  </h3>
                  <p className="break-words text-sm leading-6 text-muted-foreground">
                    {formatLockerAddress(locker)}
                  </p>
                </div>
              </div>
              <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border font-bold border-violet-500/15 bg-card px-3 py-2 text-sm text-violet-700 dark:text-violet-300">
                <PanelsTopLeft size={16} />
                <span>
                  {t('customer.order.box', { number: box.slotNumber })}
                </span>
                <span aria-hidden="true">
                  ·
                </span>
                <span>
                  {t(LOCKER_SLOT_SIZES[box.size] || 'customer.order.unknownSize')}
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('customer.order.sameReturnLocker')}
              </p>
            </div>
          </div>
        </section>
        <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <Controller
            name="paymentMethod"
            control={form.control}
            render={({ field }) => (
              <PaymentMethodPicker
                value={field.value}
                onChange={field.onChange}
                disabled={busy}
              />
            )}
          />
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/8 p-4">
            <Banknote className="shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h2 className="font-semibold">
                {t('customer.payment.afterProcessing')}
              </h2>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                {t('customer.payment.processingNote')}
              </p>
            </div>
          </div>
          <label className="flex flex-col gap-3">
            <span className="text-sm font-medium">
              {t('customer.order.note')}
            </span>
            <textarea
              {...register('customerNote')}
              rows={3}
              maxLength={ORDER_LIMITS.NOTE_MAX}
              disabled={busy}
              aria-invalid={!!errors.customerNote}
              aria-describedby={errors.customerNote ? 'order-note-error' : undefined}
              className="w-full resize-y rounded-xl border border-input bg-background p-3 outline-none transition-[border-color,box-shadow] delay-0 duration-200 ease-in-out hover:border-primary/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              placeholder={t('customer.order.notePlaceholder')}
            />
          </label>
          {errors.customerNote && (
            <p
              id="order-note-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {t(errors.customerNote.message)}
            </p>
          )}
        </section>
      </div>
      <aside className="overflow-hidden space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm lg:sticky lg:top-[var(--customer-header-offset)]">
        <h2 className={`${ORDER_PANEL_HEADER_STYLES} -mx-5 -mt-5 text-lg font-semibold`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <TicketPercent size={21} />
          </span>
          {t('customer.order.quote')}
        </h2>
        <PromotionPicker
          promotions={quote.data?.availablePromotions}
          code={promotionCode}
          onSelect={onApply}
          onClear={onClear}
          disabled={busy}
          loading={quote.loading}
        />
        {quote.loading || quote.error ? (
          <CatalogFeedback
            {...quote}
            loadingText="customer.order.loadingQuote"
          />
        ) : quote.data && (
          <>
            <dl className="space-y-4 border-t border-border pt-5">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t('customer.order.subtotal')}
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(quote.data.totalAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t('customer.order.discount')}
                </dt>
                <dd className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  −
                  {formatCurrency(quote.data.discountAmount)}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                <dt className="font-semibold">
                  {t('customer.order.total')}
                </dt>
                <dd className="text-2xl font-bold tabular-nums text-primary">
                  {formatCurrency(quote.data.finalAmount)}
                </dd>
              </div>
            </dl>
            {quote.data.appliedPromotion && (
              <p className="break-words rounded-lg bg-violet-500/10 p-3 text-xs text-violet-700 dark:text-violet-300">
                {t('customer.order.applied', { code: quote.data.appliedPromotion.code })}
              </p>
            )}
          </>
        )}
        <FormError>
          {codeDirty ? 'customer.order.applyCodeFirst' : ''}
        </FormError>
        <div className="flex gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3.5">
          <Info className="mt-1 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <p className="text-xs leading-6 text-muted-foreground">
            {t('customer.order.weightNote')}
          </p>
        </div>
      </aside>
    </div>
  )
}
