import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'
import ProfileHeader from '@/components/profile/ProfileHeader'
import EmptyState from '@/components/ui/EmptyState'
import UserLevelCard from '@/components/gamification/UserLevelCard'

export default async function ProfilPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  const [profil,favorites,review,badge,earnbadge,photo]=await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('categories').select('places (id,name,district,average_rating)').eq('user_id',userId),
    supabase.from('reviews')
    .select(`
      id, rating, comment, created_at,
      places ( id, name )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false }),
    supabase.from('badges')
    .select('*')
    .order('criteria_value', { ascending: true }),
    supabase.from('user_badges')
    .select('badge_id')
    .eq('user_id', userId),
    supabase.from('photos')
    .select(`
      id, url, caption, created_at,
      places ( id, name )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  ]
    
  )
  const profile=profil.data || []
  const favoritesData=favorites.data || []
  const reviewsData= review.data || []
  const badgesData= badge.data || []
  const earnedBadges= earnbadge.data || []
  const photosData= photo.data || []

  /*const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: favoritesData } = await supabase
    .from('favorites')
    .select(`
      places ( id, name, district, average_rating )
    `)
    .eq('user_id', userId)*/

  const favoritePlaces = (favoritesData ?? [])
    .map(f => f.places)
    .filter(place => place !== null)

  /*const { data: reviewsData } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      places ( id, name )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })*/

  const reviews = reviewsData ?? []

  /*const { data: badgesData } = await supabase
    .from('badges')
    .select('*')
    .order('criteria_value', { ascending: true })

  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)*/

  const earnedIds = (earnedBadges ?? []).map((row: any) => row.badge_id)

  /*const { data: photosData } = await supabase
    .from('photos')
    .select(`
      id, url, caption, created_at,
      places ( id, name )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })*/

  const userPhotos = photosData ?? []

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === userId

  let initialFollowing = false
  if (user && !isOwnProfile) {
    const { data: follow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle()
    initialFollowing = !!follow
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Profil Başlığı */}
        <AnimatedSection>
          <ProfileHeader
            userId={userId}
            username={profile?.username || ''}
            bio={profile?.bio || ''}
            avatarUrl={profile?.avatar_url || null}
            totalFollowers={profile?.total_followers || 0}
            totalFollowing={profile?.total_following || 0}
            isOwnProfile={isOwnProfile}
            currentUserId={user?.id ?? null}
            initialFollowing={initialFollowing}
            instagram={profile?.instagram || null}
            twitter={profile?.twitter || null}
            tiktok={profile?.tiktok || null}
            website={profile?.website || null}
          />
        </AnimatedSection>

        {/* Seviye & XP Kartı */}
        <AnimatedSection delay={0.03}>
          <div className="mb-8">
            <UserLevelCard
              totalReviews={profile?.total_reviews || 0}
              totalPhotos={profile?.total_photos || 0}
              totalFavorites={profile?.total_favorites || 0}
              totalRatings={profile?.total_ratings || 0}
            />
          </div>
        </AnimatedSection>

        {/* Rozet Vitrini */}
        <AnimatedSection delay={0.05}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mb-8">
            <h2 className="font-bold text-lg text-gray-100 mb-4">🏅 Rozetler</h2>
            {badgesData && badgesData.length > 0 ? (
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                {badgesData.map((badge: any) => {
                  const earned = earnedIds.includes(badge.id)
                  return (
                    <div
                      key={badge.id}
                      className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 ${
                        earned
                          ? 'bg-primary-500/20 border border-primary-400/50'
                          : 'bg-gray-800/80 border border-white/10'
                      }`}
                      title={`${badge.name}: ${badge.description}`}
                    >
                      <span className={`text-5xl ${earned ? '' : 'opacity-70'}`}>{badge.icon}</span>
                      <span className={`text-sm text-center leading-tight px-2 ${
                        earned ? 'text-gray-100' : 'text-gray-400'
                      }`}>
                        {badge.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon="🏅"
                title="Henüz rozet eklenmemiş"
                description="Aktif oldukça rozetler kazanacaksın."
              />
            )}
          </div>
        </AnimatedSection>

        {/* İstatistikler ve Favoriler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatedSection delay={0.1}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6">
              <h2 className="font-bold text-lg text-gray-100 mb-4">📊 İstatistikler</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/5">
                  <div className="text-2xl font-bold text-primary-400">{profile?.total_reviews || 0}</div>
                  <div className="text-sm text-gray-400">Yorum</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/5">
                  <div className="text-2xl font-bold text-primary-400">{profile?.total_favorites || 0}</div>
                  <div className="text-sm text-gray-400">Favori</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/5">
                  <div className="text-2xl font-bold text-primary-400">{profile?.total_photos || 0}</div>
                  <div className="text-sm text-gray-400">Fotoğraf</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/5">
                  <div className="text-2xl font-bold text-primary-400">{profile?.total_ratings || 0}</div>
                  <div className="text-sm text-gray-400">Puanlama</div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6">
              <h2 className="font-bold text-lg text-gray-100 mb-4">❤️ Favori Mekanlar</h2>
              {favoritePlaces.length > 0 ? (
                <ul className="space-y-3">
                  {favoritePlaces.map((place: any) => (
                    <li key={place.id}>
                      <Link
                        href={`/mekan/${place.id}`}
                        className="block bg-white/5 rounded-lg p-3 hover:bg-white/10 transition border border-white/5"
                      >
                        <div className="font-semibold text-gray-200">{place.name}</div>
                        <div className="text-sm text-gray-400">
                          {place.district} • ⭐ {Number(place.average_rating).toFixed(1)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="❤️"
                  title="Henüz favori mekan eklenmemiş"
                  description="Beğendiğin mekanları favorilere ekleyerek burada görüntüleyebilirsin."
                />
              )}
            </div>
          </AnimatedSection>
        </div>

        {/* Fotoğraflarım */}
        <AnimatedSection delay={0.3}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mt-8">
            <h2 className="font-bold text-lg text-gray-100 mb-4">📸 Fotoğraflarım</h2>
            {userPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {userPhotos.map((photo: any) => (
                  <div key={photo.id} className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Fotoğraf'}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2">
                      <Link
                        href={`/mekan/${photo.places?.id}`}
                        className="text-sm text-gray-200 hover:text-primary-400"
                      >
                        📍 {photo.places?.name || 'Bilinmeyen Mekan'}
                      </Link>
                      {photo.caption && <p className="text-xs text-gray-400 mt-1">{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="📸"
                title="Henüz fotoğraf paylaşılmamış"
                description="Mekanları ziyaret ettiğinde fotoğraf yükleyebilirsin."
              />
            )}
          </div>
        </AnimatedSection>

        {/* Yorumlarım */}
        <AnimatedSection delay={0.35}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mt-8">
            <h2 className="font-bold text-lg text-gray-100 mb-4">💬 Yorumlarım</h2>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="border border-white/5 rounded-xl p-4 bg-white/5">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/mekan/${review.places?.id}`}
                        className="font-semibold text-gray-200 hover:text-primary-400"
                      >
                        📍 {review.places?.name || 'Bilinmeyen Mekan'}
                      </Link>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-gray-300">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="💬"
                title="Henüz yorum yapılmamış"
                description="Mekanlar hakkında yorum yaparak deneyimini paylaş."
              />
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}