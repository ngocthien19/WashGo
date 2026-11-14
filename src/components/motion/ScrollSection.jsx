import { motion, useReducedMotion } from 'framer-motion'
import { UI_MOTION } from '~/utils/config/constants'

const elements = { section: motion.section, div: motion.div, aside: motion.aside }

export default function ScrollSection({ as = 'section', direction = 'left', disabled = false, children, ...props }) {
  const reduceMotion = useReducedMotion()
  if (disabled) {
    const Element = as
    return (
      <Element {...props}>
        {children}
      </Element>
    )
  }
  const Element = elements[as] || motion.section
  return (
    <Element
      {...props}
      initial={reduceMotion ? false : { opacity: 0, x: direction === 'left' ? -56 : 56 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: .08 }}
      transition={{ duration: reduceMotion ? 0 : .65, ease: UI_MOTION.EASE }}
    >
      {children}
    </Element>
  )
}
