'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ListelerimPage() {
  const [myLists, setMyLists] = useState<any[]>([])
  const [suggestedLists, setSuggestedLists] = useState<any[]>([])
  const [likedListIds, setLikedListIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }
      setCurrentUser(user)

      const { data: my } = await supabase
        .from('user_lists')
        .select(`
          id, name, is_public, like_count, created_at,
          user_list_items (
            id,
            places ( id, name, district, average_rating )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      setMyLists(my ?? [])

      const { data: suggested } = await supabase
        .from('user_lists')
        .select(`
          id, name, is_public, like_count, created_at,
          profiles ( id, username, avatar_url ),
          user_list_items (
            id,
            places ( id, name, district, average_rating )
          )
        `)
        .eq('is_public', true)
        .neq('user_id', user.id)
        .order('like_count', { ascending: false })
        .limit(10)

      setSuggestedLists(suggested ?? [])

      const { data: likedData } = await supabase
        .from('user_list_likes')
        .select('list_id')
        .eq('user_id', user.id)

      setLikedListIds((likedData ?? []).map((item: any) => item.list_id))

      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  
  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel(`list-likes-realtime-${currentUser.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_list_likes' },
        (payload) => {
          const newLike = payload.new

          
          setSuggestedLists(prev =>
            prev.map(list =>
              list.id === newLike.list_id
                ? { ...list, like_count: (list.like_count || 0) + 1 }
                : list
            )
          )

          
          setMyLists(prev =>
            prev.map(list =>
              list.id === newLike.list_id
                ? { ...list, like_count: (list.like_count || 0) + 1 }
                : list
            )
          )

          
          if (newLike.user_id === currentUser.id) {
            setLikedListIds(prev => [...prev, newLike.list_id])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_list_likes' },
        (payload) => {
          const deletedLike = payload.old

          setSuggestedLists(prev =>
            prev.map(list =>
              list.id === deletedLike.list_id
                ? { ...list, like_count: Math.max((list.like_count || 1) - 1, 0) }
                : list
            )
          )

          setMyLists(prev =>
            prev.map(list =>
              list.id === deletedLike.list_id
                ? { ...list, like_count: Math.max((list.like_count || 1) - 1, 0) }
                : list
            )
          )

          if (deletedLike.user_id === currentUser.id) {
            setLikedListIds(prev => prev.filter(id => id !== deletedLike.list_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUser])

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm('Bu listeyi silmek istediğinize emin misiniz?')) return
    await supabase.from('user_lists').delete().eq('id', listId)
    setMyLists(prev => prev.filter(list => list.id !== listId))
  }

  const handleRemoveItem = async (itemId: string, listId: string) => {
    await supabase.from('user_list_items').delete().eq('id', itemId)
    setMyLists(prev =>
      prev.map(list =>
        list.id === listId
          ? { ...list, user_list_items: list.user_list_items.filter((item: any) => item.id !== itemId) }
          : list
      )
    )
  }

  const togglePublic = async (listId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    await supabase.from('user_lists').update({ is_public: newStatus }).eq('id', listId)
    setMyLists(prev =>
      prev.map(list => list.id === listId ? { ...list, is_public: newStatus } : list)
    )
  }

  const handleLikeList = async (listId: string) => {
    if (!currentUser) {
      router.push('/giris')
      return
    }

    const alreadyLiked = likedListIds.includes(listId)

    if (alreadyLiked) {
      await supabase
        .from('user_list_likes')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', currentUser.id)

      setLikedListIds(prev => prev.filter(id => id !== listId))
      setSuggestedLists(prev =>
        prev.map(list =>
          list.id === listId
            ? { ...list, like_count: Math.max((list.like_count || 1) - 1, 0) }
            : list
        )
      )
    } else {
      await supabase
        .from('user_list_likes')
        .insert({ list_id: listId, user_id: currentUser.id })

      setLikedListIds(prev => [...prev, listId])
      setSuggestedLists(prev =>
        prev.map(list =>
          list.id === listId
            ? { ...list, like_count: (list.like_count || 0) + 1 }
            : list
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="md" className="py-8" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-gray-100 mb-8">📋 Listelerim</h1>
        </AnimatedSection>

        
        {myLists.length > 0 ? (
          <div className="space-y-6 mb-12">
            {myLists.map((list) => (
              <AnimatedSection key={list.id}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-100">{list.name}</h2>
                      <span className="text-xs text-gray-400">
                        {list.is_public ? '🌍 Herkese açık' : '🔒 Gizli'}
                        {' • '}
                        ❤️ {list.like_count || 0} beğeni
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePublic(list.id, list.is_public)}
                        className={`text-sm px-4 py-2 rounded-full transition ${
                          list.is_public
                            ? 'bg-gray-700 text-white hover:bg-gray-600'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {list.is_public ? 'Gizli Yap' : 'Herkese Açık Yap'}
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="text-sm px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                      >
                        Listeyi Sil
                      </button>
                    </div>
                  </div>

                  {list.user_list_items && list.user_list_items.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {list.user_list_items.map((item: any) => {
                        const place = item.places
                        if (!place) return null
                        return (
                          <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <Link
                              href={`/mekan/${place.id}`}
                              className="font-semibold text-gray-100 hover:text-primary-400 transition"
                            >
                              {place.name}
                            </Link>
                            <p className="text-sm text-gray-400">
                              {place.district} • ⭐ {Number(place.average_rating).toFixed(1)}
                            </p>
                            <button
                              onClick={() => handleRemoveItem(item.id, list.id)}
                              className="mt-2 text-xs text-red-400 hover:text-red-300"
                            >
                              Listeden Çıkar
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400">Bu liste boş.</p>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-400">Henüz listeniz yok.</p>
          </div>
        )}

        
        <AnimatedSection>
          <h2 className="text-2xl font-bold text-gray-100 mb-6">✨ Önerilen Listeler</h2>
        </AnimatedSection>

        {suggestedLists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedLists.map((list) => {
              const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles
              const isLiked = likedListIds.includes(list.id)
              return (
                <AnimatedSection key={list.id}>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition flex flex-col h-full">
                    <Link href={`/listeler/${list.id}`} className="flex-1">
                      <h3 className="text-xl font-bold text-gray-100">{list.name}</h3>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                          {owner?.avatar_url ? (
                            <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (owner?.username?.[0] || 'K').toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-gray-300">{owner?.username || 'Anonim'}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        📅 {new Date(list.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </Link>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-gray-400">❤️ {list.like_count || 0}</span>
                      <button
                        onClick={() => handleLikeList(list.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          isLiked
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        {isLiked ? 'Beğenildi' : 'Beğen'}
                      </button>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🌍</div>
            <p className="text-gray-400">Henüz keşfedilecek herkese açık liste yok.</p>
          </div>
        )}
      </div>
    </div>
  )
}