import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, Package, ScrollText, Shirt } from 'lucide-react'
import { Button } from '~/components/ui/button'
import ServiceDetails from '~/components/customer/services/ServiceDetails'
import LockerDetails from '~/components/customer/lockers/LockerDetails'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { chatCardDestination, chatOrderStatusKey } from './chatbotModel'

export default function ChatResult({ result, onNavigate, onOpenTerms }) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState(null)
  if (!result) {
    return null
  }
  return (
    <>
      <div className="mt-3 space-y-2">
        {(result.cards || []).filter((card) => ['Service', 'Locker', 'Order', 'Policy'].includes(card.type)).map((card, index) => {
          const data = card.data || {}
          const Icon = { Service: Shirt, Locker: MapPin, Order: Package, Policy: ScrollText }[card.type]
          const destination = chatCardDestination(card)
          const validId = /^[0-9a-f-]{36}$/i.test(card.id)
          return (
            <article
              key={`${card.type}-${card.id}-${index}`}
              className="rounded-xl border border-primary/15 bg-card p-3 text-sm"
            >
              <h3 className="flex items-start gap-2 font-semibold">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                {card.title}
              </h3>
              {card.type === 'Service' && (
                <>
                  <p className="mt-2 font-semibold text-primary">
                    {formatCurrency(data.unitPrice)}
                    {data.unit ? ` / ${data.unit}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('chatbot.listPrice')}
                  </p>
                </>
              )}
              {card.type === 'Locker' && (
                <>
                  <p className="mt-2">
                    {[data.address, data.ward, data.district, data.city].filter(Boolean).join(', ')}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t('chatbot.slots', { count: data.availableSlotCount ?? '—' })}
                    {Number.isFinite(data.distanceKm) ? ` · ${formatNumber(data.distanceKm)} km` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('chatbot.lockerSnapshot')}
                  </p>
                </>
              )}
              {card.type === 'Order' && (
                <>
                  {chatOrderStatusKey(data.status) && (
                    <p className="mt-2 font-medium text-primary">
                      {t(chatOrderStatusKey(data.status))}
                    </p>
                  )}
                  <p className="mt-2 font-semibold">
                    {formatCurrency(data.finalAmount ?? data.totalAmount)}
                  </p>
                  <p className="mt-1">
                    {data.nextStep}
                  </p>
                  {data.predictedFinishAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('chatbot.eta', { date: formatDateTime(data.predictedFinishAt) })}
                    </p>
                  )}
                </>
              )}
              {card.type === 'Policy' && (
                <p className="mt-2 text-muted-foreground">
                  {t('chatbot.policyVersion', { version: data.version || '—' })}
                </p>
              )}
              {destination ? (
                <Link
                  to={destination}
                  onClick={onNavigate}
                  className="mt-2 inline-flex min-h-10 items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t('chatbot.details')}
                  <ArrowUpRight className="size-4" />
                </Link>
              ) : (validId || card.type === 'Policy') && (
                <Button
                  variant="link"
                  className="mt-2 h-10 px-0 text-primary"
                  onClick={() => card.type === 'Policy' ? (onNavigate(), onOpenTerms()) : setDetail(card)}
                >
                  {t('chatbot.details')}
                  <ArrowUpRight className="size-4" />
                </Button>
              )}
            </article>
          )
        })}
      </div>
      {!!result.sources?.length && (
        <details className="mt-3 border-t border-border/70 pt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer py-1 font-medium">
            {t('chatbot.sources')}
          </summary>
          <ul className="mt-1 space-y-2">
            {result.sources.map((source, index) => (
              <li key={`${source.code}-${index}`}>
                {`${source.title} · ${formatDateTime(source.retrievedAt)}`}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            {t('chatbot.historical')}
          </p>
        </details>
      )}
      {detail?.type === 'Service' && (
        <ServiceDetails
          id={detail.id}
          onClose={() => setDetail(null)}
        />
      )}
      {detail?.type === 'Locker' && (
        <LockerDetails
          id={detail.id}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  )
}
