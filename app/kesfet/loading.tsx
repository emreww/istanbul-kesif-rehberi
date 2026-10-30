import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function KesfetLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
      <LoadingSpinner size="lg" />
    </div>
  )
}