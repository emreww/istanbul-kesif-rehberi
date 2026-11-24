'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-14 w-14 border-4',
}

export default function LoadingSpinner({
  size = 'md',
  className = '',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-t-primary-500 border-b-primary-500 border-l-transparent border-r-transparent`}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
        {spinner}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {spinner}
    </div>
  )
}