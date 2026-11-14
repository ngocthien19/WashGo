import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '~/lib/utils'

export default function Spinner({ className, size, label, decorative = false }) {
  const { t } = useTranslation()
  const gradientId = useId()
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative ? true : undefined}
      className={cn('relative inline-flex size-5 shrink-0 align-middle', className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="size-full motion-safe:animate-[spin_1.1s_linear_infinite]"
      >
        <defs>
          <linearGradient id={gradientId}>
            <stop
              stopColor="currentColor"
              stopOpacity=".1"
            />
            <stop
              offset="1"
              stopColor="currentColor"
            />
          </linearGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="12"
          stroke="currentColor"
          strokeOpacity=".12"
          strokeWidth="3"
        />
        <path
          d="M16 4a12 12 0 1 1-12 12"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="4"
          cy="16"
          r="2"
          fill="currentColor"
        />
      </svg>
      <span className="absolute inset-[40%] rounded-full bg-current opacity-40" />
      {!decorative && (
        <span className="sr-only">
          {label || t('common.loadingWashgo')}
        </span>
      )}
    </span>
  )
}
