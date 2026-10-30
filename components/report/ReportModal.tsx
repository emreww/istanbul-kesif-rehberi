'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useNotificationStore } from '@/store/notifications'

interface ReportModalProps {
  targetType: 'place' | 'review' | 'user'
  targetId: string
}

export default function ReportModal({ targetType, targetId }: ReportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { addNotification } = useNotificationStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/giris')
      return
    }

    const payload: any = {
      user_id: user.id,
      reason: reason.trim(),
      report_type: targetType,
    }

    if (targetType === 'place') payload.place_id = targetId
    if (targetType === 'review') payload.review_id = targetId
    if (targetType === 'user') payload.reported_user_id = targetId

    const { error } = await supabase.from('reports').insert(payload)

    if (error) {
      addNotification('Rapor gönderilemedi: ' + error.message, 'warning')
      setLoading(false)
      return
    }

    addNotification('Raporunuz alındı. Teşekkürler! ⚠️', 'success')
    setLoading(false)
    setIsOpen(false)
    setReason('')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900/90 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-semibold hover:bg-rose-500/20 hover:text-white transition duration-200 shadow-md backdrop-blur-md hover:scale-105"
      >
        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 0 1 2-2h10l-2 4h2l-2 4h2l-2 4H5v6H3z" />
        </svg>
        <span>Raporla / Bildir</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-100 mb-4">Rapor Gönder</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Şikayet nedeni</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="input-field"
                  placeholder="Kısa açıklama yazın..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}