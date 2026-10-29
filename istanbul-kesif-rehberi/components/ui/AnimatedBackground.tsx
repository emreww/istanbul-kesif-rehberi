'use client'
import { motion } from 'framer-motion'

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Sıcak turuncu ton */}
      <motion.div
        className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-orange-200/30 rounded-full blur-3xl"
        animate={{
          x: [0, 90, 0],
          y: [0, 70, 0],
          scale: [1, 1.25, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Mor ton */}
      <motion.div
        className="absolute top-1/3 -right-32 w-[480px] h-[480px] bg-purple-200/30 rounded-full blur-3xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Mavi ton */}
      <motion.div
        className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-200/25 rounded-full blur-3xl"
        animate={{
          x: [0, 60, 0],
          y: [0, -70, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Pembe ton */}
      <motion.div
        className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-pink-100/30 rounded-full blur-3xl"
        animate={{
          x: [0, 40, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Çok hafif ışık noktaları */}
      <motion.div
        className="absolute top-1/4 left-1/2 w-3 h-3 bg-white/40 rounded-full blur-sm"
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-yellow-200/50 rounded-full blur-sm"
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </div>
  )
}