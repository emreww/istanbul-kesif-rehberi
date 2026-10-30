'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AddToWheelButton({ placeId }: { placeId: string }) {
  const [isAdded, setIsAdded] = useState(false)
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
          .from('wheel_slots')
          .select('id')
          .eq('place_id', placeId)
          .eq('user_id', user.id)
          .maybeSingle()
        setIsAdded(!!data)
      }
    }
    fetchData()
  }, [placeId, supabase])

  if (loadingUser) return null

  const toggleWheel = async () => {
    if (!user) {
      router.push('/giris')
      return
    }
    setLoading(true)
    if (isAdded) {
      await supabase.from('wheel_slots').delete().eq('place_id', placeId).eq('user_id', user.id)
      setIsAdded(false)
    } else {
      await supabase.from('wheel_slots').insert({
        place_id: placeId,
        user_id: user.id,
        wheel_name: 'Varsayılan Çark'
      })
      setIsAdded(true)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggleWheel}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition duration-200 shadow-md ${
        isAdded
          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-300 shadow-amber-500/30 scale-105'
          : 'bg-slate-900/90 hover:bg-amber-500/20 text-amber-200 hover:text-white border border-amber-500/40 backdrop-blur-md'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
    >
      <span>🎡</span>
      <span>{loading ? 'İşleniyor...' : isAdded ? 'Çarkta Ekli' : 'Çarkıma Ekle'}</span>
    </button>
  )
}