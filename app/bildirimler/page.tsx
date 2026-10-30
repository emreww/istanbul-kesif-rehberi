'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default function BildirimlerPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        setLoadingUser(false)
        router.push('/giris')
        return
      }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data ?? [])
      setLoadingUser(false)
    }

    fetchData()
  }, [supabase, router])

  // Realtime dinleme (INSERT)
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const handleDelete = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 animate-pulse">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-gray-100 mb-8">🔔 Bildirimler</h1>
        </AnimatedSection>

        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 border flex items-start gap-3 ${
                  notification.read
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/10 border-primary-500/30'
                }`}
              >
                <div className="text-2xl">
                  {notification.type === 'success' ? '✅' : notification.type === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div className="flex-1">
                  <p className="text-gray-200">{notification.message}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="text-gray-400 hover:text-red-400 transition"
                  title="Bildirimi sil"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-400">Henüz bildirim yok.</p>
          </div>
        )}
      </div>
    </div>
  )
}