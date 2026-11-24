/*'use client'
import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-14 w-14 border-4',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} rounded-full border-t-primary-500 border-b-primary-500 border-l-transparent border-r-transparent animate-spin`}
      />
    </div>
  )
}*/
export default function LoadingSpinner(){
  return (
    <div className="fixed inset-2 z-60 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
      <div className="animate-spin rounded-full h-15 w-15 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  )
}

