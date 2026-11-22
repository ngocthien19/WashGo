import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { Button } from '~/components/ui/button'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ShipperCapacity from './ShipperCapacity'
import { canAssignShipper, shipperBlockedKey } from '~/utils/orders/shipperCapacity'

export default function ShipperSelection({ resource, value, onChange, disabled }) {
  const { t } = useTranslation()
  useEffect(() => {
    if (value && (resource.loading || resource.error || !resource.data?.some(row => row.id === value && canAssignShipper(row)))) {
      onChange(null)
    }
  }, [value, resource.loading, resource.error, resource.data, onChange])
  if (resource.loading || resource.error || !resource.data?.length) {
    return (
      <ResourceFeedback
        {...resource}
        loadingText="merchant.loading"
        empty="merchant.orders.noShippers"
      />
    )
  }
  return (
    <fieldset
      className="space-y-3"
      disabled={disabled}
    >
      <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-base font-semibold">
        {t('merchant.orders.chooseShipper')}
        <span className="text-sm font-medium text-muted-foreground">
          {t('merchant.shippers.eligibleCount', { count: resource.data.filter(canAssignShipper).length })}
        </span>
      </legend>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={resource.retry}
      >
        {t('customer.orders.refresh')}
      </Button>
      {resource.data.map(row => {
        const selectable = canAssignShipper(row)
        return (
          <label
            key={row.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${!selectable ? 'cursor-not-allowed border-border bg-muted/20' : value === row.id ? 'cursor-pointer border-primary bg-primary/5 ring-1 ring-primary/20' : 'cursor-pointer border-border bg-background hover:border-primary/40'} has-focus-visible:ring-2 has-focus-visible:ring-primary`}
          >
            <UserAvatar
              avatar={row.avatar || row.avatarUrl}
              fullName={row.fullName}
              className="size-11 text-sm"
            />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="block break-words font-semibold">
                {row.fullName}
              </span>
              <span className="block break-all text-sm text-muted-foreground">
                {row.email || '—'}
              </span>
              <span className="block text-sm text-muted-foreground">
                {row.phone || '—'}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t(`merchant.shippers.vehicles.${row.vehicleType}`, { defaultValue: '—' })}
                {row.vehiclePlate && ` · ${row.vehiclePlate}`}
              </span>
              <ShipperCapacity shipper={row} />
              {!selectable && (
                <span className="block text-sm text-destructive">
                  {t(shipperBlockedKey(row))}
                </span>
              )}
            </span>
            <input
              type="radio"
              name="assignment-shipper"
              aria-label={row.fullName}
              checked={value === row.id}
              disabled={!selectable}
              onChange={() => onChange(row)}
              className="mt-1 size-5 shrink-0 accent-primary"
            />
          </label>
        )
      })}
    </fieldset>
  )
}
