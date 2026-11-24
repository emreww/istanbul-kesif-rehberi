'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/store/notifications'

interface ReportModalProps {
  targetType: 'place' | 'review' | 'user'
  targetId: string
}

export default function ReportModal({ targetType, targetId }: ReportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (isMounted) {
        setCurrentUser(user ?? null)
        setAuthChecking(false)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setCurrentUser(session?.user ?? null)
        setAuthChecking(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleOpenModal = async () => {
    if (authChecking) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    setCurrentUser(user ?? null)

    if (!user) {
      addNotification('Rapor göndermek için önce hesabınıza giriş yapmalısınız.', 'warning')
      router.push('/giris')
      return
    }

    if (targetType === 'user' && user.id === targetId) {
      addNotification('Kendi hesabınızı raporlayamazsınız.', 'warning')
      return
    }

    setIsOpen(true)
  }

  const handleClose = () => {
    if (loading) return
    setIsOpen(false)
    setReason('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || loading) return

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      setIsOpen(false)
      setCurrentUser(null)
      addNotification('Oturumunuz bulunamadı. Lütfen giriş yapın.', 'warning')
      router.push('/giris')
      return
    }

    if (targetType === 'user' && user.id === targetId) {
      setLoading(false)
      setIsOpen(false)
      addNotification('Kendi hesabınızı raporlayamazsınız.', 'warning')
      return
    }

    const payload: Record<string, any> = {
      user_id: user.id,
      reason: reason.trim(),
      report_type: targetType,
    }

    if (targetType === 'place') payload.place_id = targetId
    if (targetType === 'review') payload.review_id = targetId
    if (targetType === 'user') payload.reported_user_id = targetId

    const { error } = await supabase.from('reports').insert(payload)

    setLoading(false)

    if (error) {
      addNotification('Rapor gönderilemedi: ' + error.message, 'warning')
      return
    }

    addNotification('Raporunuz alındı. Teşekkürler!', 'success')
    setIsOpen(false)
    setReason('')
    router.refresh()
  }

  // Kullanıcı kendi profil sayfasındaysa butonu hiç göstermeyelim
  if (!authChecking && targetType === 'user' && currentUser?.id === targetId) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={authChecking}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900/90 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-semibold hover:bg-rose-500/20 hover:text-white transition duration-200 shadow-md backdrop-blur-md hover:scale-105 cursor-pointer disabled:opacity-60"
      >
        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 21v-4m0 0V5a2 2 0 0 1 2-2h10l-2 4h2l-2 4h2l-2 4H5v6H3z"
          />
        </svg>
        <span>Raporla / Bildir</span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-xs" onClick={handleClose} />
            <div className="relative bg-slate-900/95 border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-100 mb-4">Rapor Gönder</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="report-reason" className="block text-sm text-gray-300 mb-2">
                    Şikayet nedeni
                  </label>
                  <textarea
                    id="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="input-field"
                    placeholder="Kısa açıklama yazın..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-600 text-sm font-medium transition disabled:opacity-60 cursor-pointer"
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