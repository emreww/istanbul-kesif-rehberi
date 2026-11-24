import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default async function ListeDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: list } = await supabase
    .from('user_lists')
    .select(`
      id, name, is_public, like_count, created_at,
      profiles ( id, username, avatar_url ),
      user_list_items (
        id,
        places ( id, name, district, average_rating, total_reviews )
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!list) {
    notFound()
  }

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles
  const items = list.user_list_items || []
  const validPlaceCount = items.filter((item: any) => Boolean(item?.places)).length

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="mb-8">
            <Link
              href="/listeler"
              className="inline-block text-sm text-gray-400 hover:text-gray-200 transition mb-3"
            >
              ← Tüm Listelere Dön
            </Link>

            <h1 className="text-3xl font-bold text-gray-100">{list.name}</h1>

            <div className="flex items-center flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                  {owner?.avatar_url ? (
                    <img
                      src={owner.avatar_url}
                      alt={owner?.username || 'Kullanıcı'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (owner?.username?.[0] || 'K').toUpperCase()
                  )}
                </div>
                {owner?.id ? (
                  <Link
                    href={`/profil/${owner.id}`}
                    className="text-gray-200 hover:text-primary-400 transition font-medium"
                  >
                    {owner?.username || 'Anonim'}
                  </Link>
                ) : (
                  <span className="text-gray-200 font-medium">
                    {owner?.username || 'Anonim'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>📍 {validPlaceCount} mekan</span>
                <span>•</span>
                <span>❤️ {list.like_count || 0} beğeni</span>
                <span>•</span>
                <span>📅 {new Date(list.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {validPlaceCount > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {items.map((item: any) => {
              const place = item.places
              if (!place) return null
              return (
                <AnimatedSection key={item.id}>
                  <Link
                    href={`/mekan/${place.id}`}
                    className="flex flex-col justify-between h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-gray-100">{place.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {place.district || 'İstanbul'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-200 font-semibold">
                        {Number(place.average_rating || 0).toFixed(1)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        ({place.total_reviews || 0} yorum)
                      </span>
                    </div>
                  </Link>
                </AnimatedSection>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-400">Bu liste boş.</p>
          </div>
        )}
      </div>
    </div>
  )
}