import { motion, useReducedMotion } from 'framer-motion'
import { UI_MOTION } from '~/utils/constants'

const elements = { div: motion.div, article: motion.article, li: motion.li }

export default function Reveal({ as = 'div', delay = 0, lift = false, children, ...props }) {
  const reduceMotion = useReducedMotion()
  const Element = elements[as] || motion.div

  return (
    <Element
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : UI_MOTION.DURATION, delay: reduceMotion ? 0 : delay, ease: UI_MOTION.EASE } }}
      viewport={{ once: true, amount: 0.08 }}
      whileHover={lift && !reduceMotion ? { y: -5 } : undefined}
      transition={{ duration: reduceMotion ? 0 : 0.2, delay: 0, ease: UI_MOTION.EASE }}
      {...props}
    >
      {children}
    </Element>
  )
}
