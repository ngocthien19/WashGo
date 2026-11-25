import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { dailyShift, dailyWeek, readSchedule } from './scheduleModel'

export default function OpeningScheduleEditor({ control }) {
  const { t, i18n } = useTranslation()
  return (
    <Controller
      name="openingSchedule"
      control={control}
      render={({ field, fieldState }) => {
        const value = readSchedule(field.value)
        const daily = dailyShift(value)
        const update = patch => field.onChange({ ...value, ...patch })
        const setDay = (dayOfWeek, shifts) => update({ weekly: [...value.weekly.filter(day => day.dayOfWeek !== dayOfWeek), ...(shifts.length ? [{ dayOfWeek, shifts }] : [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek) })
        return (
          <fieldset className="space-y-4 rounded-xl border p-4 sm:col-span-2">
            <legend className="px-2 font-semibold">
              {t('schedule.title')}
              {' '}
              <span className="text-destructive">*</span>
            </legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value.alwaysOpen}
                onChange={event => update({ alwaysOpen: event.target.checked, weekly: [] })}
              />
              {t('schedule.always')}
            </label>
            {!value.alwaysOpen && daily && (
              <div className="grid gap-3 sm:grid-cols-2">
                {['open', 'close'].map(key => (
                  <label
                    key={key}
                    className="grid gap-2 text-sm font-medium"
                  >
                    {t(`schedule.${key}`)}
                    <Input
                      aria-label={t(`schedule.${key}`)}
                      placeholder="HH:mm"
                      maxLength={5}
                      value={daily[key]}
                      onChange={event => update({ weekly: dailyWeek({ ...daily, [key]: event.target.value }) })}
                    />
                  </label>
                ))}
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  {t('schedule.everyday')}
                </p>
              </div>
            )}
            {!value.alwaysOpen && (
              <details
                open={!daily || undefined}
                className="rounded-lg border bg-muted/15 p-3"
              >
                <summary className="cursor-pointer font-medium">
                  {t('schedule.custom')}
                </summary>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('schedule.hint')}
                  </p>
                  {!daily && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => update({ weekly: dailyWeek(value.weekly[0]?.shifts?.[0] || { open: '', close: '' }) })}
                    >
                      {t('schedule.applyDaily')}
                    </Button>
                  )}
                  {Array.from({ length: 7 }, (_, index) => index + 1).map(day => {
                    const shifts = value.weekly.find(item => item.dayOfWeek === day)?.shifts || []
                    const label = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 23 + day - 1)))
                    return (
                      <div
                        key={day}
                        className="space-y-2 border-t pt-3"
                      >
                        <label className="flex items-center gap-2 font-medium">
                          <input
                            type="checkbox"
                            checked={!!shifts.length}
                            onChange={event => setDay(day, event.target.checked ? [{ open: '', close: '' }] : [])}
                          />
                          {label}
                        </label>
                        {shifts.map((shift, index) => (
                          <div
                            key={index}
                            className="flex flex-wrap items-center gap-2"
                          >
                            {['open', 'close'].map(key => (
                              <Input
                                key={key}
                                aria-label={`${label} ${t(`schedule.${key}`)} ${index + 1}`}
                                placeholder="HH:mm"
                                maxLength={5}
                                value={shift[key]}
                                className="w-24"
                                onChange={event => setDay(day, shifts.map((item, row) => row === index ? { ...item, [key]: event.target.value } : item))}
                              />
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setDay(day, shifts.filter((_, row) => row !== index))}
                            >
                              {t('schedule.remove')}
                            </Button>
                          </div>
                        ))}
                        {!!shifts.length && shifts.length < 4 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDay(day, [...shifts, { open: '', close: '' }])}
                          >
                            {t('schedule.add')}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            )}
            <details
              open={value.closedDates.some(Boolean) || undefined}
              className="rounded-lg border bg-muted/15 p-3"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {t('schedule.closed')}
              </summary>
              <label className="grid gap-2 text-sm">
                <span className="sr-only">
                  {t('schedule.closed')}
                </span>
                <textarea
                  className="mt-3 min-h-20 rounded-lg border bg-background p-3"
                  value={value.closedDates.join('\n')}
                  onChange={event => update({ closedDates: event.target.value.split('\n') })}
                  onBlur={() => update({ closedDates: [...new Set(value.closedDates.map(date => date.trim()).filter(Boolean))] })}
                  placeholder="2026-12-25"
                />
              </label>
            </details>
            {fieldState.error && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {t('schedule.invalid')}
              </p>
            )}
          </fieldset>
        )
      }}
    />
  )
}
