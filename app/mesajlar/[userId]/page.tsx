'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import { useNotificationStore } from '@/store/notifications'

export default function SohbetPage() {
  const params = useParams()
  const receiverId = String(params?.userId ?? '')
  const router = useRouter()

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [receiver, setReceiver] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [canMessage, setCanMessage] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  const getChannelName = (userIdA: string, userIdB: string) => {
    const sorted = [userIdA, userIdB].sort()
    return `chat-${sorted[0]}-${sorted[1]}`
  }

  // Kullanıcı, alıcı ve takip durumunu yükle
  useEffect(() => {
    const init = async () => {
      setLoadingPage(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }
      setCurrentUser(user)

      const [{ data: receiverData }, { data: followsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', receiverId)
          .single(),
        supabase
          .from('user_follows')
          .select('follower_id, following_id')
          .or(
            `and(follower_id.eq.${user.id},following_id.eq.${receiverId}),and(follower_id.eq.${receiverId},following_id.eq.${user.id})`
          ),
      ])

      setReceiver(receiverData)

      const iFollowReceiver = !!followsData?.some(
        (f) => f.follower_id === user.id && f.following_id === receiverId
      )
      const receiverFollowsMe = !!followsData?.some(
        (f) => f.follower_id === receiverId && f.following_id === user.id
      )

      // Karşılıklı takip gerekiyorsa: iFollowReceiver && receiverFollowsMe
      // Sadece sizin takip etmeniz yeterliyse: iFollowReceiver
      setCanMessage(iFollowReceiver && receiverFollowsMe)
      setLoadingPage(false)
    }
    init()
  }, [supabase, receiverId, router])

  // Mesajları yükle ve Realtime kanalı kur
  useEffect(() => {
    if (!currentUser || !receiverId) return

    const channelName = getChannelName(currentUser.id, receiverId)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          if (
            (msg.sender_id === currentUser.id && msg.receiver_id === receiverId) ||
            (msg.sender_id === receiverId && msg.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, msg])
            if (msg.receiver_id === currentUser.id) {
              supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
              channel.send({
                type: 'broadcast',
                event: 'read_receipt',
                payload: { readerId: currentUser.id, receiverId: receiverId },
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? { ...m, is_read: updatedMsg.is_read } : m))
          )
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!canMessage) return
        if (payload.userId === receiverId) {
          setIsTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        if (payload.readerId === receiverId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id === currentUser.id && m.receiver_id === receiverId
                ? { ...m, is_read: true }
                : m
            )
          )
        }
      })
      .subscribe()

    channelRef.current = channel

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, is_read')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })

      setMessages(data ?? [])

      const { data: updatedMessages } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', currentUser.id)
        .eq('sender_id', receiverId)
        .eq('is_read', false)
        .select('id')

      if (updatedMessages && updatedMessages.length > 0) {
        channel.send({
          type: 'broadcast',
          event: 'read_receipt',
          payload: { readerId: currentUser.id, receiverId: receiverId },
        })
      }
    }

    fetchMessages()

    return () => {
      supabase.removeChannel(channel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [supabase, currentUser, receiverId, canMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleTyping = () => {
    if (!channelRef.current || !currentUser || !canMessage) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id },
    })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || sending) return

    if (!canMessage) {
      addNotification('Mesaj gönderebilmek için birbirinizi takip etmeniz gerekiyor.', 'warning')
      return
    }

    setSending(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
    })

    if (error) {
      addNotification('Mesaj gönderilemedi: ' + error.message, 'warning')
      setSending(false)
      return
    }

    setNewMessage('')
    setSending(false)
  }

  if (loadingPage) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100dvh-64px)] flex flex-col">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col h-full max-w-3xl mx-auto w-full px-4 py-3">
        {/* Başlık */}
        <div className="flex items-center gap-3 py-2 border-b border-white/10">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full text-gray-300 hover:bg-white/10 transition"
          >
            ←
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold overflow-hidden">
            {receiver?.avatar_url ? (
              <img src={receiver.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              receiver?.username?.[0]?.toUpperCase() || 'K'
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-100">
              {receiver?.username || 'Sohbet'}
            </h1>
            {isTyping && canMessage && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="text-xs text-primary-400">yazıyor</span>
              </div>
            )}
          </div>
        </div>

        {/* Mesajlar */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUser?.id
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm break-words ${
                      isMine
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-gray-800 text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                    <div className="text-[10px] opacity-70 mt-1 text-right flex items-center justify-end gap-1">
                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      {isMine && (
                        <span className="text-[10px]">
                          {msg.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                      {isMine && msg.is_read && (
                        <span className="text-[10px] opacity-80">Görüldü</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {isTyping && canMessage && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-200 px-4 py-2 rounded-2xl rounded-bl-md flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Takip edilmiyorsa bilgilendirme */}
        {!canMessage && (
          <div className="mb-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 text-center">
            Mesajlaşabilmek için bu kullanıcı ile karşılıklı takipleşmeniz gerekiyor.
          </div>
        )}

        {/* Yazma alanı */}
        <form onSubmit={handleSend} className="py-2 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            disabled={!canMessage || sending}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            placeholder={canMessage ? 'Mesaj yaz...' : 'Takipleşme gerekli...'}
            className="input-field rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canMessage || sending || !newMessage.trim()}
            className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        .typing-dot {
          width: 6px;
          height: 6px;
          background-color: #d1d5db;
          border-radius: 9999px;
          animation: typingBlink 1.2s infinite both;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typingBlink {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  )
}