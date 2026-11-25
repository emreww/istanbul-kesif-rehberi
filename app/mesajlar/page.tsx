'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'

interface ConversationItem {
  userId: string
  username: string
  avatarUrl: string | null
  lastMessage: string
  createdAt: string
  isRead: boolean
  unreadCount: number
}

export default function MesajlarPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadConversations = useCallback(
    async (uid: string) => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, content, created_at, is_read, sender_id, receiver_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Mesajlar alınamadı:', error.message)
        setConversations([])
        return
      }

      if (!messages || messages.length === 0) {
        setConversations([])
        return
      }

      const partnerIds = Array.from(
        new Set(
          messages
            .map((msg: any) => (msg.sender_id === uid ? msg.receiver_id : msg.sender_id))
            .filter(Boolean)
        )
      )

      const profileMap = new Map<string, { username?: string | null; avatar_url?: string | null }>()

      if (partnerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', partnerIds)

        if (profilesError) {
          console.error('Profiller alınamadı:', profilesError.message)
        } else {
          ;(profilesData ?? []).forEach((p: any) => {
            profileMap.set(p.id, {
              username: p.username,
              avatar_url: p.avatar_url,
            })
          })
        }
      }

      const conversationMap = new Map<string, ConversationItem>()

      messages.forEach((msg: any) => {
        const partnerId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
        if (!partnerId) return

        const profile = profileMap.get(partnerId)
        const isIncomingUnread = msg.receiver_id === uid && !msg.is_read

        const existing = conversationMap.get(partnerId)
        if (!existing) {
          conversationMap.set(partnerId, {
            userId: partnerId,
            username: profile?.username || 'Anonim',
            avatarUrl: profile?.avatar_url || null,
            lastMessage: msg.content,
            createdAt: msg.created_at,
            isRead: msg.sender_id === uid ? true : Boolean(msg.is_read),
            unreadCount: isIncomingUnread ? 1 : 0,
          })
        } else if (isIncomingUnread) {
          existing.unreadCount += 1
        }
      })

      setConversations(Array.from(conversationMap.values()))
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
        router.push('/giris')
        return
      }

      setUserId(user.id)
      await loadConversations(user.id)
      if (active) setLoading(false)
    }

    void init()
    return () => {
      active = false
    }
  }, [supabase, router, loadConversations])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`conversations-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = (payload.new || payload.old) as any
          if (!row) return
          if (row.sender_id === userId || row.receiver_id === userId) {
            void loadConversations(userId)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, supabase, loadConversations])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <AnimatedSection>
          <h1 className="text-2xl font-bold text-gray-100 mb-6 px-2">💬 Mesajlar</h1>
        </AnimatedSection>

        {conversations.length > 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl divide-y divide-white/5">
            {conversations.map((conv) => (
              <Link
                key={conv.userId}
                href={`/mesajlar/${conv.userId}`}
                className="flex items-center gap-3 p-4 hover:bg-white/5 transition"
              >
                <div className="relative w-12 h-12 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                  {conv.avatarUrl ? (
                    <img src={conv.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    conv.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-gray-100 truncate">{conv.username}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(conv.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className={`text-sm truncate ${
                        conv.unreadCount > 0 ? 'font-semibold text-gray-100' : 'text-gray-400'
                      }`}
                    >
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-primary-500 text-white rounded-full shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-gray-400">Henüz mesajınız yok.</p>
            <p className="text-gray-500 text-sm mt-2">
              Takip ettiğiniz kullanıcıların profiline gidip “Mesaj Gönder” butonunu kullanın.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}