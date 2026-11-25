import { useTranslation } from 'react-i18next'

export default function CoverageBlockedNotice({ lockers }) {
  const { t } = useTranslation()
  if (!Array.isArray(lockers) || !lockers.length) {
    return null
  }
  return (
    <div
      role="alert"
      className="space-y-2 rounded-xl border border-destructive/30 p-4"
    >
      <p>
        {t('coverage.excluded')}
      </p>
      <ul className="space-y-2">
        {lockers.map(row => (
          <li key={row.lockerId}>
            {row.code}
            {' '}
            ·
            {' '}
            {row.name}
            {' '}
            ·
            {' '}
            {row.distanceKm ?? '—'}
            {' '}
            km /
            {' '}
            {row.serviceRadiusKm}
            {' '}
            km
          </li>
        ))}
      </ul>
    </div>
  )
}
