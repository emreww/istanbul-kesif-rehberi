'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FavoriteButton({ placeId }: { placeId: string }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)

      if (user) {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('place_id', placeId)
          .eq('user_id', user.id)
          .maybeSingle()
        setIsFavorite(!!data)
      }
    }
    fetchData()
  }, [placeId, supabase])

  if (loadingUser) return null

  const toggleFavorite = async () => {
    if (!user) {
      router.push('/giris')
      return
    }
    setLoading(true)
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('place_id', placeId).eq('user_id', user.id)
      setIsFavorite(false)
    } else {
      await supabase.from('favorites').insert({ place_id: placeId, user_id: user.id })
      setIsFavorite(true)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition duration-200 shadow-md ${
        isFavorite
          ? 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-400 shadow-rose-500/30 scale-105'
          : 'bg-slate-900/90 hover:bg-rose-500/20 text-rose-200 hover:text-white border border-rose-500/40 backdrop-blur-md'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
    >
      <span>{isFavorite ? '❤️' : '🤍'}</span>
      <span>{loading ? 'İşleniyor...' : isFavorite ? 'Favorilerde' : 'Favorilere Ekle'}</span>
    </button>
  )
}