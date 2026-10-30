'use client'
import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BanCheck() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkBan = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason')
        .eq('id', user.id)
        .single()

      if (profile?.is_banned) {
        await supabase.auth.signOut()
        const reason = profile.ban_reason || 'Belirtilmemiş'
        router.push(`/giris?ban=1&reason=${encodeURIComponent(reason)}`)
        router.refresh()
      }
    }

    checkBan()

    // Realtime ile profiller tablosunu dinle
    const channel = supabase
      .channel('ban-check')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const { id: currentUserId, is_banned, ban_reason } = payload.new
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && user.id === currentUserId && is_banned) {
              supabase.auth.signOut()
              const reason = ban_reason || 'Belirtilmemiş'
              router.push(`/giris?ban=1&reason=${encodeURIComponent(reason)}`)
              router.refresh()
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null
}