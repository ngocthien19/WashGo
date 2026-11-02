export const formatCountdown = (seconds) => {
  const remaining = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(remaining / 60)
  const remainder = String(remaining % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export const normalizePhone = (value = '') => value.replace(/\D/g, '')
