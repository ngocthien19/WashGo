import { useTranslation } from 'react-i18next'
import { readSchedule } from './scheduleModel'

export default function OpeningScheduleSummary({ value }) {
  const { t, i18n } = useTranslation()
  const schedule = readSchedule(value)
  return (
    <div className="space-y-2 text-sm">
      {schedule.alwaysOpen ? (
        <p>
          {t('schedule.always')}
        </p>
      ) : schedule.weekly.length ? schedule.weekly.map(day => (
        <p key={day.dayOfWeek}>
          {new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 22 + day.dayOfWeek)))}
          {': '}
          {day.shifts.map(shift => `${shift.open}–${shift.close}`).join(', ')}
        </p>
      )) : <p>—</p>}
      <p className="text-muted-foreground">
        {schedule.timeZone}
      </p>
      {!!schedule.closedDates.length && (
        <p>
          {t('schedule.closed')}
          :
          {' '}
          {schedule.closedDates.join(', ')}
        </p>
      )}
    </div>
  )
}
