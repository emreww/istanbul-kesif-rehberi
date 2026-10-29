'use client'
import { motion } from 'framer-motion'

export default function AnimatedHeroTitle() {
  const title = "Bugün nereye gidelim?"

  return (
    <motion.h1
      className="text-4xl md:text-5xl font-bold mb-4 whitespace-nowrap"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {title.split('').map((char, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="inline-block"
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.h1>
  )
}