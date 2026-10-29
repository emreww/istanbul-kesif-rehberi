'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useNotificationStore } from '@/store/notifications'

interface OwnershipRequestButtonProps {
  placeId: string
  ownerId: string | null
}

export default function OwnershipRequestButton({ placeId, ownerId }: OwnershipRequestButtonProps) {
  const [user, setUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyRequested, setAlreadyRequested] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Kullanıcı mekanın sahibi ise zaten onaylanmış demektir
        if (ownerId === user.id) {
          setAlreadyRequested(false) // sahibi olduğu için talep durumu gösterme
          return
        }

        // Daha önce talepte bulunmuş mu?
        const { data } = await supabase
          .from('ownership_requests')
          .select('id, status')
          .eq('place_id', placeId)
          .eq('user_id', user.id)
          .maybeSingle()

        // Status 'pending' ise zaten bekliyor, 'approved' ise onaylanmış (ama ownerId atanmamış olabilir)
        if (data) {
          setAlreadyRequested(data.status === 'pending')
          // Eğer onaylanmışsa ownerId prop'u da güncellenmiş olmalı, ama yine de kontrol edelim
        }
      }
    }
    fetchUser()
  }, [placeId, supabase, ownerId])

  // Eğer kullanıcı sahibi ise hiçbir şey gösterme (zaten düzenleme butonu ayrı gösteriliyor)
  if (!user || ownerId === user.id) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setMessage('Lütfen kısa bir açıklama yazın.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('ownership_requests').insert({
      place_id: placeId,
      user_id: user.id,
      message: message.trim(),
    })

    if (error) {
      setLoading(false)
      addNotification('Talep gönderilemedi: ' + error.message, 'warning')
      return
    }

    setLoading(false)
    setShowForm(false)
    setAlreadyRequested(true)
    addNotification('Sahiplik talebiniz alındı. Admin onayı bekliyor.', 'success')
    router.refresh()
  }

  if (alreadyRequested) {
    return (
      <div className="mt-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
        <p className="text-sm text-yellow-300">Sahiplik talebiniz admin onayı bekliyor.</p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 hover:text-white transition duration-200 backdrop-blur-md"
        >
          <span>💼</span> Bu mekanın sahibi misiniz? Sahiplik Talep Et
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Neden sahibi olduğunuzu kısaca açıklayın:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="input-field"
            placeholder="İşletme sahibiyim, bilgileri güncellemek istiyorum..."
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary text-sm py-2 px-4">
              {loading ? 'Gönderiliyor...' : 'Gönder'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded-full text-sm hover:bg-gray-600 transition"
            >
              İptal
            </button>
          </div>
        </form>
      )}
    </div>
  )
}