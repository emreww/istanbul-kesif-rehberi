'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface FollowButtonProps {
  targetUserId: string
  currentUserId: string | null
  initialFollowing: boolean
  refreshOnChange?: boolean
  onFollowChange?: (isFollowing: boolean) => void
}

export default function FollowButton({
  targetUserId,
  currentUserId,
  initialFollowing,
  refreshOnChange = false,
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) return

    const channel = supabase
      .channel(`follow-${currentUserId}-${targetUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_follows' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.follower_id === currentUserId && payload.new.following_id === targetUserId) {
            setIsFollowing(true)
          }
          if (payload.eventType === 'DELETE' && payload.old.follower_id === currentUserId && payload.old.following_id === targetUserId) {
            setIsFollowing(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, targetUserId, supabase])

  if (!currentUserId || currentUserId === targetUserId) return null

  const toggleFollow = async () => {
    if (!currentUserId) {
      router.push('/giris')
      return
    }
    setLoading(true)

    if (isFollowing) {
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
      setIsFollowing(false)
      onFollowChange?.(false)
    } else {
      await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        })
      setIsFollowing(true)
      onFollowChange?.(true)
    }

    if (refreshOnChange) {
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'} ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? 'İşleniyor...' : isFollowing ? 'Takiptesin' : 'Takip Et'}
    </button>
  )
}