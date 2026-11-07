import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '~/utils/formats'

export default function AnimatedNumber({ value, decimals = 0 }) {
  const text = useRef(null)
  const reduceMotion = useReducedMotion()
  const { i18n } = useTranslation()
  useEffect(() => {
    if (!Number.isFinite(value) || !text.current) {
      return
    }
    if (reduceMotion) {
      text.current.textContent = formatNumber(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.85,
      ease: 'easeOut',
      onUpdate: (current) => {
        if (text.current) {
          text.current.textContent = formatNumber(Number(current.toFixed(decimals)))
        }
      }
    })
    return () => controls.stop()
  }, [value, decimals, reduceMotion, i18n.resolvedLanguage])
  return (
    <span className="tabular-nums">
      <span className="sr-only">
        {formatNumber(value)}
      </span>
      <span
        ref={text}
        aria-hidden="true"
      >
        {formatNumber(value)}
      </span>
    </span>
  )
}
