'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default function MesajlarPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }

      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, is_read,
          sender_id, receiver_id,
          sender:profiles!messages_sender_id_fkey ( id, username, avatar_url ),
          receiver:profiles!messages_receiver_id_fkey ( id, username, avatar_url )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!messages) {
        setLoading(false)
        return
      }

      const conversationMap = new Map()
      messages.forEach((msg: any) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const partner = msg.sender_id === user.id ? msg.receiver : msg.sender

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            userId: partnerId,
            username: partner?.username || 'Anonim',
            avatarUrl: partner?.avatar_url || null,
            lastMessage: msg.content,
            createdAt: msg.created_at,
            isRead: msg.is_read || msg.sender_id === user.id,
          })
        }
      })

      setConversations(Array.from(conversationMap.values()))
      setLoading(false)
    }

    fetchConversations()
  }, [supabase, router])

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
                      {new Date(conv.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className={`text-sm truncate ${!conv.isRead ? 'font-semibold text-gray-200' : 'text-gray-400'}`}>
                      {conv.lastMessage}
                    </p>
                    {!conv.isRead && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />
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
              Takip ettiğiniz kullanıcıların profiline gidip "Mesaj Gönder" butonunu kullanın.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}