'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type Variant = 'up' | 'left' | 'right' | 'zoom'

interface AnimatedSectionProps {
  children: ReactNode
  delay?: number
  variant?: Variant
}

export default function AnimatedSection({
  children,
  delay = 0,
  variant = 'up',
}: AnimatedSectionProps) {
  const variants = {
    up: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
    left: { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0 } },
    zoom: { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5, delay }}
      variants={variants[variant]}
    >
      {children}
    </motion.div>
  )
}