import { Trans, useTranslation } from 'react-i18next'
import { formatCurrency } from '~/utils/formats'

const GROUPS = [
  { key: 'booking', match: /đặt|gửi|booking|deposit/i, rules: ['depositWindowMinutes'] },
  { key: 'payment', match: /giá|thanh toán|pricing|payment/i, rules: ['unpaidStorageAfterDays'] },
  { key: 'cancellation', match: /hủy|cancellation/i, rules: ['cancelLatePendingPercent', 'cancelDepositedPercent', 'cancelCollectedPercent'] },
  { key: 'pickup', match: /nhận|pickup|collection/i, rules: ['freePickupHours', 'overdueFeeDay1', 'overdueFeeDay2', 'overdueFeeDay3', 'storageTransferAfterHours', 'storageFeePerDay'] },
  { key: 'incident', match: /sự cố|bồi thường|incident|compensation/i, rules: ['compensationLightPercent', 'compensationMediumPercent', 'compensationSeverePercent', 'compensationLostPercent'] }
]
const emphasizeNumbers = (text) => text.split(/(\d+(?:[.,]\d+)*)/g).map((part, index) => index % 2 ? (
  <strong
    key={index}
    className="font-bold text-foreground"
  >
    {part}
  </strong>
) : part)

function Rules({ group, rules }) {
  const { t } = useTranslation()
  const keys = group.rules.filter((key) => Number.isFinite(rules[key]))
  if (!keys.length) {
    return null
  }
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-amber-700/15 bg-amber-50/80 p-4 text-sm leading-6 dark:border-amber-500/20 dark:bg-amber-700/10 sm:p-5">
      {keys.map((key) => (
        <p key={key}>
          <Trans
            i18nKey={`customer.sync.rules.${key}`}
            values={{ value: /Fee/.test(key) ? formatCurrency(rules[key]) : rules[key] }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        </p>
      ))}
      {group.key === 'cancellation' && (
        <p className="border-t border-amber-700/15 pt-3 text-muted-foreground dark:border-amber-500/20">
          {t('customer.sync.quoteSource')}
        </p>
      )}
    </div>
  )
}

export default function TermsContent({ policy }) {
  const { t } = useTranslation()
  const used = new Set()
  const sections = policy.terms.content.trim().split(/\n(?=\s*\d+[.)]\s)/).filter(Boolean).map((text) => {
    const section = text.match(/^\s*(\d+)[.)]\s*([^:\n]+):\s*([\s\S]*)$/)
    if (!section) {
      return { body: text }
    }
    const [, number, title, body] = section
    const group = GROUPS.find((item) => item.match.test(title) && !used.has(item.key))
    if (group) {
      used.add(group.key)
    }
    return { number, title, body: body ? body[0].toLocaleUpperCase() + body.slice(1) : '', group }
  })
  return (
    <div className="grid gap-6 sm:gap-7">
      {sections.map((section, index) => (
        <section
          key={index}
          className="border-b border-border/70 pb-6 last:border-0 last:pb-0"
        >
          {section.title && (
            <h2 className="mb-3 flex items-start gap-2 text-lg font-bold leading-7 text-foreground">
              <span className="shrink-0">
                {section.number}
                .
              </span>
              {' '}
              <span>
                {section.title}
              </span>
            </h2>
          )}
          <p className="whitespace-pre-wrap break-words text-base leading-7 text-foreground/85">
            {emphasizeNumbers(section.body)}
          </p>
          {section.group && (
            <Rules
              group={section.group}
              rules={policy.rules}
            />
          )}
        </section>
      ))}
      {GROUPS.filter((group) => !used.has(group.key) && group.rules.some((key) => Number.isFinite(policy.rules[key]))).map((group) => (
        <section key={group.key}>
          <h2 className="text-lg font-bold text-foreground">
            {t(`customer.sync.termSections.${group.key}`)}
          </h2>
          <Rules
            group={group}
            rules={policy.rules}
          />
        </section>
      ))}
    </div>
  )
}
