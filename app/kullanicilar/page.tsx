'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import FollowButton from '@/components/profile/FollowButton'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  Users,
  Search,
  MessageSquare,
  UserPlus,
  Camera,
  Heart,
  X,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

const SIRALAMA_SECENEKLERI = [
  { value: 'en-yeni', label: 'En Yeni' },
  { value: 'en-cok-yorum', label: 'En Çok Yorum Yapan' },
  { value: 'en-cok-takipci', label: 'En Çok Takipçi' },
  { value: 'en-cok-fotograf', label: 'En Çok Fotoğraf' },
  { value: 'en-cok-favori', label: 'En Çok Favori' },
]

function getMemberBadge(totalReviews: number, totalPhotos: number) {
  const score = (totalReviews || 0) + (totalPhotos || 0) * 2
  if (score >= 25) return 'Usta Kaşif'
  if (score >= 8) return 'Aktif Üye'
  return 'Yeni Üye'
}

export default function KullanicilarPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [siralama, setSiralama] = useState('en-yeni')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [followedIds, setFollowedIds] = useState<string[]>([])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [q])

  const fetchUsers = useCallback(async () => {
    setProfilesLoaded(false)
    let query = supabase
      .from('profiles')
      .select(
        'id, username, avatar_url, bio, total_reviews, total_followers, total_photos, total_favorites, created_at'
      )

    if (debouncedQ) {
      const escapedQ = debouncedQ.replace(/[%_]/g, '\\$&')
      query = query.or(`username.ilike.%${escapedQ}%,bio.ilike.%${escapedQ}%`)
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
  }, [supabase, debouncedQ, siralama])

  useEffect(() => {
    const fetchAuthData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
    setDebouncedQ(q.trim())
  }

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    setFollowedIds((prev) =>
      isFollowing ? (prev.includes(userId) ? prev : [...prev, userId]) : prev.filter((id) => id !== userId)
    )
    setProfiles((prevProfiles) =>
      prevProfiles.map((p) =>
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
  const hasFilter = Boolean(q.trim() || siralama !== 'en-yeni')

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Başlık */}
        <AnimatedSection>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-xs font-medium text-amber-300 mb-3">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Topluluk Üyeleri</span>
              {!isLoading && (
                <>
                  <span className="text-amber-400/60">•</span>
                  <span className="font-semibold text-gray-100">{profiles.length} kullanıcı</span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-100">Kullanıcılar</h1>
            <p className="text-gray-400 mt-1">
              İstanbul'u keşfeden üyeleri incele, yorumlarını takip et ve topluluğa katıl.
            </p>
          </div>
        </AnimatedSection>

        {/* Arama ve Sıralama */}
        <AnimatedSection delay={0.1}>
          <form
            onSubmit={handleSearch}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-5 md:p-6 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label htmlFor="kullanici-ara" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Arama
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="kullanici-ara"
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Kullanıcı adı veya biyografi..."
                    className="input-field pl-10 pr-9"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => {
                        setQ('')
                        setDebouncedQ('')
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-4">
                <label htmlFor="kullanici-siralama" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Sıralama
                </label>
                <select
                  id="kullanici-siralama"
                  value={siralama}
                  onChange={(e) => setSiralama(e.target.value)}
                  className="input-field"
                >
                  {SIRALAMA_SECENEKLERI.map((secenek) => (
                    <option key={secenek.value} value={secenek.value}>
                      {secenek.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full h-[42px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition cursor-pointer shadow-sm"
                >
                  Filtrele
                </button>
              </div>
            </div>
          </form>
        </AnimatedSection>

        {/* Sonuç Durumu */}
        {!isLoading && hasFilter && (
          <div className="flex items-center justify-between gap-3 mb-5 px-1">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-amber-400">{profiles.length}</span> kullanıcı listeleniyor
            </p>
            <button
              type="button"
              onClick={() => {
                setQ('')
                setDebouncedQ('')
                setSiralama('en-yeni')
              }}
              className="text-sm font-medium text-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}

        {/* Kullanıcı Kartları */}
        {isLoading ? (
          <div className="text-center py-16">
            <LoadingSpinner size="md" className="py-8" />
          </div>
        ) : profiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {profiles.map((profile, index) => {
              const badge = getMemberBadge(profile.total_reviews, profile.total_photos)

              return (
                <AnimatedSection key={profile.id} delay={Math.min(index * 0.03, 0.25)}>
                  <div className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-amber-400/35 rounded-2xl p-6 transition-all duration-200 h-full flex flex-col justify-between shadow-lg">
                    {/* Üst: Üye Rozeti ve Profil Linki */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[11px] font-semibold text-amber-300">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{badge}</span>
                        </span>

                        <Link
                          href={`/profil/${profile.id}`}
                          className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-amber-300 transition"
                        >
                          <span>Profil</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <Link href={`/profil/${profile.id}`} className="shrink-0">
                          <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 group-hover:border-amber-400/60 flex items-center justify-center text-xl text-amber-300 font-bold overflow-hidden transition">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.username || 'Kullanıcı'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              profile.username?.[0]?.toUpperCase() || 'K'
                            )}
                          </div>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/profil/${profile.id}`}
                            className="block text-lg font-bold text-gray-100 group-hover:text-amber-300 transition truncate"
                          >
                            {profile.username || 'Anonim'}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Katılım: {new Date(profile.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>

                      {profile.bio ? (
                        <p className="text-xs text-gray-300/90 mt-3.5 line-clamp-2 leading-relaxed min-h-[2.25rem]">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 italic mt-3.5 min-h-[2.25rem]">
                          Henüz biyografi eklenmemiş
                        </p>
                      )}
                    </div>

                    {/* Alt: 2x2 İstatistik ve Takip Butonu */}
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                            siralama === 'en-cok-yorum'
                              ? 'bg-amber-400/10 border-amber-400/35 text-amber-200'
                              : 'bg-white/[0.03] border-white/10 text-gray-300'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5 text-gray-400">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                            <span>Yorum</span>
                          </span>
                          <span className="font-bold text-gray-100">{profile.total_reviews || 0}</span>
                        </div>

                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                            siralama === 'en-cok-takipci'
                              ? 'bg-amber-400/10 border-amber-400/35 text-amber-200'
                              : 'bg-white/[0.03] border-white/10 text-gray-300'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5 text-gray-400">
                            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                            <span>Takipçi</span>
                          </span>
                          <span className="font-bold text-gray-100">{profile.total_followers || 0}</span>
                        </div>

                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                            siralama === 'en-cok-fotograf'
                              ? 'bg-amber-400/10 border-amber-400/35 text-amber-200'
                              : 'bg-white/[0.03] border-white/10 text-gray-300'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5 text-gray-400">
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            <span>Fotoğraf</span>
                          </span>
                          <span className="font-bold text-gray-100">{profile.total_photos || 0}</span>
                        </div>

                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                            siralama === 'en-cok-favori'
                              ? 'bg-amber-400/10 border-amber-400/35 text-amber-200'
                              : 'bg-white/[0.03] border-white/10 text-gray-300'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5 text-gray-400">
                            <Heart className="w-3.5 h-3.5 text-amber-400" />
                            <span>Favori</span>
                          </span>
                          <span className="font-bold text-gray-100">{profile.total_favorites || 0}</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <FollowButton
                          targetUserId={profile.id}
                          currentUserId={currentUserId}
                          initialFollowing={followedIds.includes(profile.id)}
                          onFollowChange={(isFollowing) => handleFollowChange(profile.id, isFollowing)}
                        />
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
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