'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'
import FollowButton from '@/components/profile/FollowButton'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function KullanicilarPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [siralama, setSiralama] = useState('en-yeni')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const supabase = useMemo(() => createClient(), [])

  const fetchUsers = useCallback(async () => {
    setProfilesLoaded(false)
    let query = supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, total_reviews, total_followers, total_photos, total_favorites, created_at')

    if (q.trim()) {
      query = query.or(`username.ilike.%${q}%,bio.ilike.%${q}%`)
    }

    switch (siralama) {
      case 'en-cok-yorum':
        query = query.order('total_reviews', { ascending: false })
        break
      case 'en-cok-takipci':
        query = query.order('total_followers', { ascending: false })
        break
      case 'en-cok-fotograf':
        query = query.order('total_photos', { ascending: false })
        break
      case 'en-cok-favori':
        query = query.order('total_favorites', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data } = await query.limit(50)
    setProfiles(data ?? [])
    setProfilesLoaded(true)
  }, [supabase, q, siralama])

  useEffect(() => {
    const fetchAuthData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: follows } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
        setFollowedIds((follows ?? []).map((f: any) => f.following_id))
      } else {
        setCurrentUserId(null)
        setFollowedIds([])
      }
      setAuthLoaded(true)
    }
    fetchAuthData()
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    setProfiles(prevProfiles =>
      prevProfiles.map(p =>
        p.id === userId
          ? {
              ...p,
              total_followers: isFollowing
                ? (p.total_followers || 0) + 1
                : Math.max((p.total_followers || 1) - 1, 0),
            }
          : p
      )
    )
  }

  const isLoading = !profilesLoaded || !authLoaded

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-gray-100 mb-8">👥 Kullanıcılar</h1>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <form onSubmit={handleSearch} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mb-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Arama</label>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Kullanıcı adı veya biyografi..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sıralama</label>
                <select
                  value={siralama}
                  onChange={(e) => setSiralama(e.target.value)}
                  className="input-field"
                >
                  <option value="en-yeni">En Yeni</option>
                  <option value="en-cok-yorum">En Çok Yorum Yapan</option>
                  <option value="en-cok-takipci">En Çok Takipçi</option>
                  <option value="en-cok-fotograf">En Çok Fotoğraf</option>
                  <option value="en-cok-favori">En Çok Favori</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">
              Filtrele
            </button>
          </form>
        </AnimatedSection>

        {isLoading ? (
          <div className="text-center py-16">
            <LoadingSpinner size="md" className="py-8" />
          </div>
        ) : profiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {profiles.map((profile, index) => (
              <AnimatedSection key={profile.id} delay={index * 0.02}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition h-full flex flex-col">
                  <Link href={`/profil/${profile.id}`}>
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-2xl text-white font-bold overflow-hidden mb-3">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profile.username?.[0]?.toUpperCase() || 'K'
                      )}
                    </div>
                  </Link>
                  <Link
                    href={`/profil/${profile.id}`}
                    className="font-semibold text-gray-100 hover:text-primary-400 transition"
                  >
                    {profile.username || 'Anonim'}
                  </Link>
                  {profile.bio && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{profile.bio}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {profile.total_reviews || 0} yorum • {profile.total_followers || 0} takipçi
                  </div>
                  <div className="mt-auto pt-4">
                    <FollowButton
                      targetUserId={profile.id}
                      currentUserId={currentUserId}
                      initialFollowing={followedIds.includes(profile.id)}
                      onFollowChange={(isFollowing) => handleFollowChange(profile.id, isFollowing)}
                    />
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="👥"
            title="Kriterlere uygun kullanıcı bulunamadı"
            description="Arama veya sıralama kriterlerini değiştirip tekrar dene."
          />
        )}
      </div>
    </div>
  )
}