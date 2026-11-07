import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shirt, Trash2, Info, ListChecks, ChevronDown } from 'lucide-react'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import CatalogToolbar from '~/components/customer/catalog/CatalogToolbar'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Pagination from '~/components/Pagination/Pagination'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { CUSTOMER_CATALOG, ORDER_LIMITS, ORDER_CHOICE_STYLES, ORDER_PANEL_HEADER_STYLES } from '~/utils/constants'
import { formatCurrency } from '~/utils/formats'
import { isWeightService } from '../orderModel'
import SelectionBadge from './SelectionBadge'

export default function OrderServices({ items, onChange }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState({ keyword: '', page: 1 })
  const [clearedId, setClearedId] = useState(null)
  const load = useCallback((signal) => customerCatalogApi.getServices({ ...query, take: CUSTOMER_CATALOG.PAGE_SIZE }, signal), [query])
  const { data, loading, error, retry } = useCatalogResource(load)
  const selected = new Set(items.map(({ service }) => service.id))
  const remove = (id) => {
    setClearedId(id)
    onChange(items.filter(({ service }) => service.id !== id))
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        <CatalogToolbar
          keyword={query.keyword}
          onSearch={(keyword) => setQuery({ keyword, page: 1 })}
          label={t('customer.order.findServices')}
          placeholder={t('customer.order.findServices')}
        />
        {loading || error || !data?.list?.length ? (
          <CatalogFeedback
            loading={loading}
            error={error}
            retry={retry}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.list.map((service) => (
              <article
                key={service.id}
                data-selected={selected.has(service.id)}
                data-hover-suppressed={clearedId === service.id}
                onPointerLeave={() => {
                  if (clearedId === service.id) {
                    setClearedId(null)
                  }
                }}
                onPointerEnter={() => setClearedId(null)}
                className={`relative isolate flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md ${ORDER_CHOICE_STYLES}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] before:absolute before:-right-8 before:-top-8 before:size-28 before:rounded-full before:bg-primary/6 after:absolute after:-right-3 after:-top-3 after:size-20 after:rounded-full after:border after:border-primary/15"
                />
                <Button
                  variant="ghost"
                  className="absolute inset-0 z-10 h-full w-full rounded-2xl border-0 bg-transparent! p-0"
                  aria-label={t(selected.has(service.id) ? 'customer.order.removeService' : 'customer.order.addService', { name: service.name })}
                  aria-pressed={selected.has(service.id)}
                  disabled={!selected.has(service.id) && items.length >= ORDER_LIMITS.MAX_SERVICES}
                  onClick={() => {
                    if (selected.has(service.id)) {
                      remove(service.id)
                    } else {
                      setClearedId(null)
                      onChange([...items, { service, quantity: 1 }])
                    }
                  }}
                >
                  <span className="sr-only">
                    {service.name}
                  </span>
                </Button>
                {selected.has(service.id) && (
                  <SelectionBadge />
                )}
                <Shirt className="order-choice-primary mb-4 size-10 rounded-xl bg-primary/10 p-2 text-primary" />
                <h2 className="line-clamp-2 pr-6 text-base font-semibold [overflow-wrap:anywhere]">
                  {service.name}
                </h2>
                <p className="order-choice-muted mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">
                  {service.description || t('customer.order.serviceFallback')}
                </p>
                <p className="text-base order-choice-primary mt-5 font-semibold text-primary">
                  {formatCurrency(isWeightService(service) ? service.unitPrice : service.pricePerItem ?? service.unitPrice)}
                  <span className="order-choice-muted ml-1 text-xs font-normal text-muted-foreground">
                    /
                    {' '}
                    {isWeightService(service) ? t('customer.order.package') : service.unit}
                  </span>
                </p>
              </article>
            ))}
          </div>
        )}
        <Pagination
          currentPage={query.page}
          totalPages={data?.totalPages || 0}
          disabled={loading}
          onPageChange={(page) => setQuery({ ...query, page })}
        />
      </div>
      <aside className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm lg:sticky lg:top-[var(--customer-header-offset)]">
        <div className={ORDER_PANEL_HEADER_STYLES}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ListChecks size={22} />
          </span>
          <h2 className="text-lg font-semibold">
            {t('customer.order.selectedServices', { count: items.length })}
          </h2>
        </div>
        <div className="space-y-3 p-5">
          {!items.length && (
            <p className="flex items-start gap-2.5 rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
              <Info className="mt-1 size-4 shrink-0 text-primary" />
              {t('customer.order.selectFirst')}
            </p>
          )}
          {items.map(({ service, quantity }) => (
            <div
              key={service.id}
              className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4"
            >
              <div className="flex items-start gap-2.5">
                <Shirt className="size-8 shrink-0 rounded-lg bg-primary/8 p-1.5 text-primary" />
                <span className="min-w-0 flex-1 line-clamp-2 text-base font-medium leading-6 [overflow-wrap:anywhere]">
                  {service.name}
                </span>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  aria-label={t('customer.order.removeService', { name: service.name })}
                  onClick={() => remove(service.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
              {isWeightService(service) ? (
                <p className="rounded-lg bg-primary/5 px-3 py-2 text-ms leading-6 text-muted-foreground">
                  {t('customer.order.onePackage')}
                </p>
              ) : (
                <label className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                  {t('customer.order.quantity', { unit: service.unit })}
                  <Input
                    className="h-10 w-20 rounded-lg bg-card text-center font-medium text-foreground"
                    type="number"
                    min={1}
                    max={ORDER_LIMITS.MAX_QUANTITY}
                    step={1}
                    value={quantity}
                    aria-label={t('customer.order.quantityFor', { name: service.name })}
                    aria-invalid={!Number.isInteger(quantity) || quantity < 1 || quantity > ORDER_LIMITS.MAX_QUANTITY}
                    onChange={(event) => onChange(items.map((item) => item.service.id === service.id ? { ...item, quantity: event.target.value === '' ? '' : Number(event.target.value) } : item))}
                  />
                </label>
              )}
            </div>
          ))}
          <details className="group rounded-xl border border-border/60 bg-muted/20 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md text-xs text-muted-foreground outline-none transition-colors delay-0 duration-200 ease-in-out hover:text-primary focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <Info className="size-4 shrink-0 text-primary" />
              {t('customer.order.weightInfo')}
              <ChevronDown className="ml-auto size-4 transition-transform delay-0 duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {t('customer.order.weightNote')}
            </p>
          </details>
        </div>
      </aside>
    </div>
  )
}
