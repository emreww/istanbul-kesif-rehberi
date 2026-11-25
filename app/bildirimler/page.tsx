'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Compass,
  Sparkles,
} from 'lucide-react'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'

interface NotificationItem {
  id: string
  user_id: string
  message: string
  type: 'success' | 'warning' | 'info' | string
  read: boolean
  created_at: string
  group_key?: string | null
}

function formatRelativeTime(isoDate: string) {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000))
  if (diffSec < 60) return 'Az önce'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dk önce`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} sa önce`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} gün önce`
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function EmptyMailboxIllustration() {
  return (
    <div className="relative mx-auto w-44 h-44 flex items-center justify-center">
      {/* Arka plan yumuşak parıltı */}
      <div className="absolute inset-4 rounded-full bg-amber-400/15 blur-2xl animate-pulse" />
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-40 h-40 drop-shadow-[0_12px_28px_rgba(251,191,36,0.16)]"
      >
        {/* Zemin gölgesi */}
        <ellipse cx="100" cy="172" rx="52" ry="8" fill="rgba(255,255,255,0.06)" />

        {/* Direk */}
        <rect x="93" y="116" width="14" height="54" rx="5" fill="#1e293b" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />

        {/* Posta kutusu gövdesi */}
        <path
          d="M52 72C52 54.3269 66.3269 40 84 40H126C143.673 40 158 54.3269 158 72V112C158 116.418 154.418 120 150 120H60C55.5817 120 52 116.418 52 112V72Z"
          fill="#0f172a"
          stroke="rgba(251,191,36,0.35)"
          strokeWidth="2.5"
        />

        {/* Ön kapak / kemer */}
        <path
          d="M52 72C52 54.3269 66.3269 40 84 40C101.673 40 116 54.3269 116 72V120H60C55.5817 120 52 116.418 52 112V72Z"
          fill="#162033"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="2"
        />

        {/* Mektup yarık ve zarf ucu */}
        <rect x="68" y="68" width="32" height="5" rx="2.5" fill="#070b14" />
        <path
          d="M71 70L84 60L97 70"
          stroke="#fbbf24"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Posta bayrağı (inik / sakin konumda) */}
        <g transform="translate(132, 66)">
          <circle cx="0" cy="18" r="5" fill="#fbbf24" />
          <path
            d="M0 18V2H18L14 7.5L18 13H0"
            fill="rgba(251,191,36,0.22)"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* Küçük parıltı yıldızları */}
        <circle cx="38" cy="54" r="2.5" fill="#fbbf24" opacity="0.7" />
        <circle cx="166" cy="46" r="2" fill="#38bdf8" opacity="0.7" />
        <path
          d="M164 88L166 93L171 95L166 97L164 102L162 97L157 95L162 93L164 88Z"
          fill="#fbbf24"
          opacity="0.65"
        />
      </svg>
    </div>
  )
}

export default function BildirimlerPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [busyAll, setBusyAll] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchNotifications = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Bildirimler alınamadı:', error.message)
        return
      }
      setNotifications((data ?? []) as NotificationItem[])
    },
    [supabase]
  )

  useEffect(() => {
    let active = true

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return

      if (!user) {
        setLoadingUser(false)
        router.push('/giris')
        return
      }

      setUserId(user.id)
      await fetchNotifications(user.id)
      if (active) setLoadingUser(false)
    }

    init()
    return () => {
      active = false
    }
  }, [supabase, router, fetchNotifications])

  // Realtime INSERT / UPDATE / DELETE dinleme
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-live-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as NotificationItem
          setNotifications((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev
            return [incoming, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id
          if (!deletedId) return
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Bildirim kanal hatası:', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.read) return
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    )
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification.id)

    if (error) {
      console.error('Okundu işaretlenemedi:', error.message)
    }
  }

  const markAllAsRead = async () => {
    if (!userId || busyAll) return
    setBusyAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('Tümü okundu işaretlenemedi:', error.message)
    }
    setBusyAll(false)
  }

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      console.error('Bildirim silinemedi:', error.message)
      if (userId) fetchNotifications(userId)
    }
  }

  const clearAll = async () => {
    if (!userId || busyAll || notifications.length === 0) return
    setBusyAll(true)
    setNotifications([])
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
    if (error) {
      console.error('Bildirimler temizlenemedi:', error.message)
      await fetchNotifications(userId)
    }
    setBusyAll(false)
  }

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const visibleNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter]
  )

  const getTypeStyle = (type: string) => {
    if (type === 'success') {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
        label: 'Başarılı',
      }
    }
    if (type === 'warning') {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        badgeBg: 'bg-amber-500/15 border-amber-500/30',
        label: 'Uyarı',
      }
    }
    return {
      icon: <Info className="w-5 h-5 text-sky-400" />,
      badgeBg: 'bg-sky-500/15 border-sky-500/30',
      label: 'Bilgi',
    }
  }

  if (loadingUser) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 space-y-4">
          <div className="h-10 w-52 rounded-2xl bg-white/5 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 sm:py-12">
        {/* Üst Başlık & Kontroller */}
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-400/10">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Bildirimler
                  </h1>
                  {unreadCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      {unreadCount} yeni
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hesabın ve etkileşimlerinle ilgili anlık güncellemeler
                </p>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={busyAll}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30 hover:bg-amber-400/25 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tümünü Okundu Yap</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={busyAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Temizle</span>
                </button>
              </div>
            )}
          </div>

          {/* Filtre Sekmeleri */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                Tümü ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                Okunmamış ({unreadCount})
              </button>
            </div>
          )}
        </AnimatedSection>

        {/* Liste veya Posta Kutusu Boş Durumu */}
        {visibleNotifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {visibleNotifications.map((notification) => {
                const style = getTypeStyle(notification.type)
                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 24, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => markAsRead(notification)}
                    className={`group relative rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex items-start gap-3.5 backdrop-blur-md ${
                      notification.read
                        ? 'bg-slate-900/55 border-white/10 hover:border-white/20'
                        : 'bg-gradient-to-r from-amber-400/[0.11] via-slate-900/80 to-slate-900/70 border-amber-400/35 shadow-lg shadow-amber-400/5 hover:border-amber-400/55'
                    }`}
                  >
                    {/* Okunmamış nokta göstergesi */}
                    {!notification.read && (
                      <span className="absolute top-4 right-4 sm:hidden w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}

                    {/* Tür İkonu */}
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${style.badgeBg}`}
                    >
                      {style.icon}
                    </div>

                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {style.label}
                        </span>
                        {!notification.read && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Yeni
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-sm leading-relaxed break-words ${
                          notification.read ? 'text-slate-300' : 'text-white font-medium'
                        }`}
                      >
                        {notification.message}
                      </p>

                      <span className="inline-block text-[11px] text-slate-400 mt-2">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>

                    {/* Sil Butonu */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(notification.id)
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                      title="Bildirimi sil"
                      aria-label="Bildirimi sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl px-6 py-14 text-center shadow-2xl"
          >
            <EmptyMailboxIllustration />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-semibold mt-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Posta Kutun Tertemiz</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mt-3">
              {filter === 'unread' ? 'Okunmamış bildirimin yok' : 'Henüz yeni bir bildirimin yok'}
            </h2>

            <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              {filter === 'unread'
                ? 'Tüm bildirimlerini inceledin. Geçmiş bildirimlerini görmek için tümü sekmesine geçebilirsin.'
                : 'Mekan önerilerin onaylandığında, yorumlarına beğeni geldiğinde veya biri seni takip ettiğinde burada görünecek.'}
            </p>

            <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
              {filter === 'unread' ? (
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-[#FCC93F] text-slate-950 text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  Tüm Bildirimleri Göster
                </button>
              ) : ""}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}