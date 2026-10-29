'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/notifications'

export default function RealtimeNotifications() {
  const [userId, setUserId] = useState<string | null>(null)
  const { notifications, removeNotification } = useNotificationStore()

  useEffect(() => {
    const supabase = createClient()
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
    }
    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new

          useNotificationStore.setState((state) => {
            // Aynı id zaten varsa ekleme
            if (state.notifications.some(n => n.id === newNotification.id)) {
              return state
            }

            // Eğer group_key varsa, aynı gruptaki mevcut bildirimi güncelle
            if (newNotification.group_key) {
              const existingIndex = state.notifications.findIndex(
                (n) => n.group_key === newNotification.group_key
              )
              if (existingIndex !== -1) {
                const updated = [...state.notifications]
                // Mevcut toast'ı güncelle (id değişmesin, animasyon korunsun)
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  message: newNotification.message,
                  type: newNotification.type,
                }
                return { notifications: updated }
              }
            }

            // Yeni bildirim ekle
            return {
              notifications: [
                {
                  id: newNotification.id,
                  message: newNotification.message,
                  type: newNotification.type,
                  group_key: newNotification.group_key,
                },
                ...state.notifications,
              ],
            }
          })

          // Otomatik silme: güncellenen veya yeni toast'ın id'sine göre zamanlayıcı kur
          // Yukarıdaki state güncellendikten sonra doğru id'yi bulmak için getState() kullan
          setTimeout(() => {
            const state = useNotificationStore.getState()
            const target = state.notifications.find(
              (n) => n.group_key === newNotification.group_key
            )
            if (target) {
              state.removeNotification(target.id)
            }
          }, 5000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 w-full max-w-xs sm:max-w-sm">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`px-4 py-3 rounded-xl shadow-2xl text-white flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-green-600'
                : notification.type === 'warning'
                ? 'bg-yellow-600'
                : 'bg-primary-600'
            }`}
          >
            <span className="flex-1 text-sm">{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}