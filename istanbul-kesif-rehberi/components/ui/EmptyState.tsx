'use client'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({
  icon = '🔍',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-400 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}