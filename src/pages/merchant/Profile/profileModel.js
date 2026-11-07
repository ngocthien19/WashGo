export const displayOpeningHours = (value) => {
  if (!value) {
    return ''
  }
  try {
    const parsed = JSON.parse(value); return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

// joinedAt is a dedicated membership date; contractStartDate is not a substitute.
export const formatJoinedDate = (value, language) => {
  if (!value) {
    return ''
  }
  const date = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'medium' }).format(date)
}
