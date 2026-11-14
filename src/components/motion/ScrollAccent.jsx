import { motion, useReducedMotion } from 'framer-motion'
import { UI_MOTION } from '~/utils/config/constants'

// Keep content visible and usable; only add a small accent as it approaches the viewport.
export default function ScrollAccent({ children, className, direction, disabled = false }) {
  const reduceMotion = useReducedMotion()
  if (disabled) {
    return (
      <div className={className}>
        {children}
      </div>
    )
  }
  const slide = direction === 'left' ? -48 : direction === 'right' ? 48 : 0
  return (
    <motion.div
      className={className}
      initial={!reduceMotion && slide ? { opacity: 0, x: slide } : false}
      whileInView={reduceMotion ? undefined : slide ? { opacity: 1, x: 0 } : { y: [14, 0] }}
      viewport={{ once: true, amount: .15, margin: '0px 0px 72px 0px' }}
      transition={{ duration: slide ? .7 : .55, ease: UI_MOTION.EASE }}
    >
      {children}
    </motion.div>
  )
}
