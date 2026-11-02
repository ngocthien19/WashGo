import { useRef } from 'react'
import { Input } from '~/components/ui/input'
import { OTP_CONFIG } from '~/utils/constants'

export default function OtpInput({ value = '', onChange, onBlur, inputRef, error }) {
  const inputs = useRef([])
  const slots = value.padEnd(OTP_CONFIG.CODE_LENGTH, ' ').split('')

  const update = (index, rawValue) => {
    const digits = rawValue.replace(/\D/g, '')
    if (!digits && rawValue) {
      return
    }
    const next = [...slots]
    const start = digits.length === OTP_CONFIG.CODE_LENGTH ? 0 : index
    if (!digits) {
      next[index] = ' '
    }
    for (let offset = 0; offset < digits.length && start + offset < next.length; offset++) {
      next[start + offset] = digits[offset]
    }
    onChange(next.join('').trimEnd())
    inputs.current[Math.min(start + digits.length, next.length - 1)]?.focus()
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      inputs.current[index + (event.key === 'ArrowLeft' ? -1 : 1)]?.focus()
    }
    if (event.key === 'Backspace' && !slots[index].trim() && index > 0) {
      event.preventDefault()
      update(index - 1, '')
      inputs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="mb-5">
      <div
        className="grid grid-cols-6 gap-2"
        role="group"
        aria-label="Mã OTP"
      >
        {slots.map((digit, index) => (
          <Input
            key={index}
            ref={(element) => {
              inputs.current[index] = element
              if (index === 0) {
                inputRef?.(element)
              }
            }}
            value={digit.trim()}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={OTP_CONFIG.CODE_LENGTH}
            aria-label={`Chữ số OTP ${index + 1}`}
            aria-invalid={!!error}
            aria-describedby={error ? 'otp-error' : undefined}
            className="h-12 rounded-lg bg-background px-0 text-center text-xl font-medium sm:h-14"
            onFocus={(event) => event.target.select()}
            onChange={(event) => update(index, event.target.value)}
            onBlur={onBlur}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={(event) => {
              event.preventDefault()
              update(index, event.clipboardData.getData('text'))
            }}
          />
        ))}
      </div>
      {error && (
        <p
          className="mt-2 text-center text-xs text-destructive"
          id="otp-error"
        >
          {error.message}
        </p>
      )}
    </div>
  )
}
