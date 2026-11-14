import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { BadgePercent, Check, TicketPercent, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'

export default function PromotionPicker({ promotions = [], code, onSelect, onClear, disabled, loading }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(code)
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline-violet"
          className="h-auto min-h-12 min-w-0 flex-1 justify-start whitespace-normal rounded-xl px-4 py-3 text-left text-base"
          disabled={disabled || loading}
          onClick={() => {
            setDraft(code); setOpen(true)
          }}
        >
          <BadgePercent className="shrink-0" />
          <span>
            {code || t('catalogUi.choosePromotion')}
          </span>
        </Button>
        {code && (
          <Button
            key={disabled ? 'removal-locked' : 'removal-ready'}
            variant="destructive"
            size="icon"
            className="size-12"
            disabled={disabled}
            aria-label={t('customer.order.removePromotion')}
            onClick={onClear}
          >
            <X />
          </Button>
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent
          closeLabel="common.close"
          className="flex max-w-lg flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <TicketPercent />
              {t('customer.order.availablePromotions')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {t('catalogUi.choosePromotion')}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-3 overflow-y-auto">
            {!promotions.length && (
              <p className="py-5 text-muted-foreground">
                {t('catalogUi.noPromotions')}
              </p>
            )}
            {promotions.map((promotion) => (
              <Button
                key={promotion.id}
                variant="outline"
                className={`h-auto min-h-20 w-full justify-between whitespace-normal rounded-xl p-4 text-left ${draft === promotion.code ? 'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/10' : ''}`}
                aria-pressed={draft === promotion.code}
                disabled={disabled || loading || !promotion.isEligible}
                tooltip={!promotion.isEligible ? promotion.ineligibleReason : undefined}
                onClick={() => {
                  setDraft(promotion.code)
                }}
              >
                <span className="min-w-0 space-y-1">
                  <span className="block font-bold">
                    {promotion.code}
                  </span>
                  {Number.isFinite(promotion.discountValue) && [1, 2].includes(promotion.discountType) && (
                    <span className="block text-base font-semibold text-primary">
                      {t(promotion.discountType === 1 ? 'catalogUi.discountPercent' : 'customer.order.discountValue', { amount: promotion.discountType === 1 ? formatNumber(promotion.discountValue) : formatCurrency(promotion.discountValue) })}
                    </span>
                  )}
                  {promotion.description && (
                    <span className="block text-sm text-muted-foreground">
                      {promotion.description}
                    </span>
                  )}
                  {Number.isFinite(promotion.minOrderAmount) && promotion.minOrderAmount > 0 && (
                    <span className="block text-sm text-muted-foreground">
                      <Trans
                        i18nKey="catalogUi.minimumOrder"
                        values={{ amount: formatCurrency(promotion.minOrderAmount) }}
                        components={{ value: <span className="font-bold text-foreground" /> }}
                      />
                    </span>
                  )}
                  {promotion.discountType === 1 && Number.isFinite(promotion.maxDiscountAmount) && (
                    <span className="block text-sm text-muted-foreground">
                      <Trans
                        i18nKey="catalogUi.maximumDiscount"
                        values={{ amount: formatCurrency(promotion.maxDiscountAmount) }}
                        components={{ value: <span className="font-bold text-foreground" /> }}
                      />
                    </span>
                  )}
                  {promotion.endAt && (
                    <span className="block text-sm text-muted-foreground">
                      <Trans
                        i18nKey="catalogUi.promotionEnds"
                        values={{ date: formatDateTime(promotion.endAt) }}
                        components={{ value: <span className="font-bold text-foreground" /> }}
                      />
                    </span>
                  )}
                  {Number.isFinite(promotion.remainingUsesForCustomer) && (
                    <span className="block text-sm text-muted-foreground">
                      <Trans
                        i18nKey="catalogUi.promotionUsesLeft"
                        values={{ count: promotion.remainingUsesForCustomer }}
                        components={{ value: <span className="font-bold text-foreground" /> }}
                      />
                    </span>
                  )}
                  {promotion.isEligible && Number.isFinite(promotion.estimatedDiscountAmount) && (
                    <span className="mt-2 block rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('catalogUi.estimatedSaving', { amount: formatCurrency(promotion.estimatedDiscountAmount) })}
                    </span>
                  )}
                  {!promotion.isEligible && promotion.ineligibleReason && (
                    <span className="block text-sm text-muted-foreground">
                      {promotion.ineligibleReason}
                    </span>
                  )}
                </span>
                {draft === promotion.code && <Check className="shrink-0" />}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
            <Button
              variant="secondary"
              className="h-12 self-end px-5 text-base"
              onClick={() => setOpen(false)}
            >
              {t('common.close')}
            </Button>
            <Button
              className="h-12 px-5 text-base"
              disabled={disabled || loading || !promotions.some((promotion) => promotion.code === draft && promotion.isEligible)}
              onClick={() => {
                onSelect(draft)
                setOpen(false)
              }}
            >
              {t('customer.apply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
